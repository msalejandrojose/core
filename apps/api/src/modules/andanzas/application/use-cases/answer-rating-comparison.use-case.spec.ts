import { AnswerRatingComparisonUseCase } from './answer-rating-comparison.use-case';
import { RankingOutOfSyncError } from '../../domain/errors/ranking-out-of-sync.error';
import { SiteEntry } from '../../domain/entities/site-entry.entity';

function makeEntry(overrides: Partial<SiteEntry> = {}): SiteEntry {
  return {
    id: 'entry-1',
    userId: 'user-1',
    siteId: 'site-1',
    status: 'VISITED',
    score: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const bucket = [
  { id: 'entry-a', siteId: 'site-a', score: 9 },
  { id: 'entry-b', siteId: 'site-b', score: 8 },
  { id: 'entry-c', siteId: 'site-c', score: 7 },
];

describe('AnswerRatingComparisonUseCase', () => {
  let siteEntries: {
    findByUserAndSite: jest.Mock;
    listRankedBucket: jest.Mock;
    updateScore: jest.Mock;
  };
  let comparisons: { create: jest.Mock };
  let useCase: AnswerRatingComparisonUseCase;

  beforeEach(() => {
    siteEntries = {
      findByUserAndSite: jest.fn().mockResolvedValue(makeEntry()),
      listRankedBucket: jest.fn().mockResolvedValue([...bucket]),
      updateScore: jest
        .fn()
        .mockImplementation((id, score) => Promise.resolve(makeEntry({ id, score }))),
    };
    comparisons = { create: jest.fn().mockResolvedValue(undefined) };
    useCase = new AnswerRatingComparisonUseCase(
      siteEntries as never,
      comparisons as never,
    );
  });

  const baseInput = {
    userId: 'user-1',
    siteId: 'site-1',
    sentiment: 'LIKED' as const,
  };

  it('rechaza si no hay una entry en curso (no encontrada)', async () => {
    siteEntries.findByUserAndSite.mockResolvedValue(null);
    await expect(
      useCase.execute({ ...baseInput, lo: 0, hi: 3, compareWithSiteId: 'site-b', newSiteIsBetter: true }),
    ).rejects.toThrow(RankingOutOfSyncError);
  });

  it('rechaza si la entry ya tiene score (no está "en curso")', async () => {
    siteEntries.findByUserAndSite.mockResolvedValue(makeEntry({ score: 5 }));
    await expect(
      useCase.execute({ ...baseInput, lo: 0, hi: 3, compareWithSiteId: 'site-b', newSiteIsBetter: true }),
    ).rejects.toThrow(RankingOutOfSyncError);
  });

  it('rechaza si el sitio de comparación no coincide con el recalculado (bucket cambió)', async () => {
    await expect(
      useCase.execute({ ...baseInput, lo: 0, hi: 3, compareWithSiteId: 'site-z', newSiteIsBetter: true }),
    ).rejects.toThrow(RankingOutOfSyncError);
    expect(comparisons.create).not.toHaveBeenCalled();
  });

  it('registra la comparación con el nuevo sitio como ganador', async () => {
    await useCase.execute({
      ...baseInput,
      lo: 0,
      hi: 3,
      compareWithSiteId: 'site-b',
      newSiteIsBetter: true,
    });

    expect(comparisons.create).toHaveBeenCalledWith({
      userId: 'user-1',
      winnerEntryId: 'entry-1',
      loserEntryId: 'entry-b',
    });
  });

  it('registra la comparación con el sitio existente como ganador', async () => {
    await useCase.execute({
      ...baseInput,
      lo: 0,
      hi: 3,
      compareWithSiteId: 'site-b',
      newSiteIsBetter: false,
    });

    expect(comparisons.create).toHaveBeenCalledWith({
      userId: 'user-1',
      winnerEntryId: 'entry-b',
      loserEntryId: 'entry-1',
    });
  });

  it('si no ha convergido, pide la siguiente comparación', async () => {
    const result = await useCase.execute({
      ...baseInput,
      lo: 0,
      hi: 3,
      compareWithSiteId: 'site-b',
      newSiteIsBetter: true,
    });

    expect(result).toEqual({ done: false, lo: 0, hi: 1, compareWithSiteId: 'site-a' });
  });

  it('al converger, calcula y persiste el score final', async () => {
    const result = await useCase.execute({
      ...baseInput,
      lo: 0,
      hi: 1,
      compareWithSiteId: 'site-a',
      newSiteIsBetter: false,
    });

    expect(result.done).toBe(true);
    // Queda entre A(9) y B(8) → punto medio 8.5
    expect(siteEntries.updateScore).toHaveBeenCalledWith('entry-1', 8.5);
  });
});
