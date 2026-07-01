// Stub the generated Prisma client so tests can run without `prisma generate`
jest.mock('../../../../infrastructure/database/prisma/prisma.service', () => ({
  PrismaService: class {},
}));

import { GetDashboardSummaryUseCase } from './get-dashboard-summary.use-case';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function makePrisma(overrides: Partial<Record<string, jest.Mock>> = {}) {
  return {
    user: { count: jest.fn().mockResolvedValue(0) },
    userRole: { count: jest.fn().mockResolvedValue(0) },
    storedFile: { count: jest.fn().mockResolvedValue(0) },
    post: { count: jest.fn().mockResolvedValue(0) },
    ...overrides,
  } as any;
}

describe('GetDashboardSummaryUseCase', () => {
  it('returns 6 KPI slugs in the expected order', async () => {
    const prisma = makePrisma();
    const useCase = new GetDashboardSummaryUseCase(prisma);
    const result = await useCase.execute();

    expect(result.kpis.map((k) => k.slug)).toEqual([
      'users.total',
      'users.active',
      'roles.total',
      'files.total',
      'blog.posts.published',
      'blog.posts.draft',
    ]);
  });

  it('maps values correctly from prisma', async () => {
    const prisma = makePrisma({
      user: {
        count: jest
          .fn()
          .mockResolvedValueOnce(100)   // users.total
          .mockResolvedValueOnce(42),   // users.active (lastLoginAt filter)
      },
      userRole: { count: jest.fn().mockResolvedValue(5) },
      storedFile: { count: jest.fn().mockResolvedValue(200) },
      post: {
        count: jest
          .fn()
          .mockResolvedValueOnce(30)   // blog.posts.published
          .mockResolvedValueOnce(8),   // blog.posts.draft
      },
    });

    const useCase = new GetDashboardSummaryUseCase(prisma);
    const result = await useCase.execute();

    const map = Object.fromEntries(result.kpis.map((k) => [k.slug, k.value]));
    expect(map['users.total']).toBe(100);
    expect(map['users.active']).toBe(42);
    expect(map['roles.total']).toBe(5);
    expect(map['files.total']).toBe(200);
    expect(map['blog.posts.published']).toBe(30);
    expect(map['blog.posts.draft']).toBe(8);
  });

  it('filters files by deletedAt: null', async () => {
    const fileCount = jest.fn().mockResolvedValue(0);
    const prisma = makePrisma({ storedFile: { count: fileCount } });

    await new GetDashboardSummaryUseCase(prisma).execute();

    expect(fileCount).toHaveBeenCalledWith({ where: { deletedAt: null } });
  });

  it('filters active users with lastLoginAt within last 30 days', async () => {
    const userCount = jest.fn().mockResolvedValue(0);
    const prisma = makePrisma({ user: { count: userCount } });

    const before = Date.now();
    await new GetDashboardSummaryUseCase(prisma).execute();
    const after = Date.now();

    // Second call is for users.active with a lastLoginAt filter
    const activeCallArg = userCount.mock.calls[1]?.[0];
    expect(activeCallArg).toMatchObject({ where: { lastLoginAt: { gte: expect.any(Date) } } });

    const gte: Date = activeCallArg.where.lastLoginAt.gte;
    expect(gte.getTime()).toBeGreaterThanOrEqual(before - THIRTY_DAYS_MS - 1000);
    expect(gte.getTime()).toBeLessThanOrEqual(after - THIRTY_DAYS_MS + 1000);
  });
});
