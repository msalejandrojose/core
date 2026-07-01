import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { KpiRegistry } from '../../application/kpi-registry.service';
import type { Granularity, KpiSeriesPoint, Range } from '../../application/kpi-definition';
import { bucketByTime } from './bucket-by-time';

@Injectable()
export class KpiBuiltinsService implements OnModuleInit {
  constructor(
    private readonly registry: KpiRegistry,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    this.registry.register({
      slug: 'users.total',
      label: 'Usuarios totales',
      category: 'users',
      unit: 'count',
      format: 'integer',
      scalar: () => this.prisma.user.count(),
      series: (range, granularity) =>
        this.createdAtSeries(
          (from, to) =>
            this.prisma.user.findMany({
              where: { createdAt: { gte: from, lte: to } },
              select: { createdAt: true },
            }),
          range,
          granularity,
        ),
    });

    this.registry.register({
      slug: 'users.active',
      label: 'Usuarios activos',
      description: 'Usuarios con isActive = true',
      category: 'users',
      unit: 'count',
      format: 'integer',
      scalar: () => this.prisma.user.count({ where: { isActive: true } }),
    });

    this.registry.register({
      slug: 'roles.total',
      label: 'Roles',
      category: 'iam',
      unit: 'count',
      format: 'integer',
      scalar: () => this.prisma.userRole.count(),
    });

    this.registry.register({
      slug: 'blog.posts.published',
      label: 'Posts publicados',
      category: 'blog',
      unit: 'count',
      format: 'integer',
      scalar: () => this.prisma.post.count({ where: { status: 'PUBLISHED' } }),
      series: (range, granularity) =>
        this.createdAtSeries(
          (from, to) =>
            this.prisma.post.findMany({
              where: { status: 'PUBLISHED', createdAt: { gte: from, lte: to } },
              select: { createdAt: true },
            }),
          range,
          granularity,
        ),
    });

    this.registry.register({
      slug: 'files.total',
      label: 'Ficheros almacenados',
      category: 'storage',
      unit: 'count',
      format: 'integer',
      scalar: () => this.prisma.storedFile.count({ where: { deletedAt: null } }),
      series: (range, granularity) =>
        this.createdAtSeries(
          (from, to) =>
            this.prisma.storedFile.findMany({
              where: { deletedAt: null, createdAt: { gte: from, lte: to } },
              select: { createdAt: true },
            }),
          range,
          granularity,
        ),
    });
  }

  private async createdAtSeries(
    fetchFn: (from: Date, to: Date) => Promise<{ createdAt: Date }[]>,
    range: Range,
    granularity: Granularity,
  ): Promise<KpiSeriesPoint[]> {
    const from = new Date(range.from);
    const to = new Date(range.to);
    // Set `to` to end of day so the last bucket includes the full day
    to.setUTCHours(23, 59, 59, 999);
    const records = await fetchFn(from, to);
    return bucketByTime(
      records.map((r) => r.createdAt),
      from,
      to,
      granularity,
    );
  }
}
