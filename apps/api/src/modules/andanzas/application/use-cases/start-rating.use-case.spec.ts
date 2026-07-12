import { StartRatingUseCase } from './start-rating.use-case';
import { SiteNotFoundError } from '../../domain/errors/site-not-found.error';
import { SiteEntryAlreadyRatedError } from '../../domain/errors/site-entry-already-rated.error';
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

describe('StartRatingUseCase', () => {
  let sites: { findById: jest.Mock };
  let siteEntries: {
    findByUserAndSite: jest.Mock;
    upsertStatus: jest.Mock;
    updateScore: jest.Mock;
    listRankedBucket: jest.Mock;
  };
  let useCase: StartRatingUseCase;

  beforeEach(() => {
    sites = { findById: jest.fn().mockResolvedValue({ id: 'site-1' }) };
    siteEntries = {
      findByUserAndSite: jest.fn().mockResolvedValue(null),
      upsertStatus: jest.fn().mockResolvedValue(makeEntry()),
      updateScore: jest
        .fn()
        .mockImplementation((id, score) => Promise.resolve(makeEntry({ id, score }))),
      listRankedBucket: jest.fn().mockResolvedValue([]),
    };
    useCase = new StartRatingUseCase(sites as never, siteEntries as never);
  });

  const input = { userId: 'user-1', siteId: 'site-1', sentiment: 'LIKED' as const };

  it('rechaza si el sitio no existe', async () => {
    sites.findById.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toThrow(SiteNotFoundError);
  });

  it('rechaza si el sitio ya tiene nota', async () => {
    siteEntries.findByUserAndSite.mockResolvedValue(makeEntry({ score: 8 }));
    await expect(useCase.execute(input)).rejects.toThrow(SiteEntryAlreadyRatedError);
    expect(siteEntries.upsertStatus).not.toHaveBeenCalled();
  });

  it('primer sitio de la banda: puntúa directamente sin pedir comparaciones', async () => {
    const result = await useCase.execute(input);

    expect(result.done).toBe(true);
    expect(siteEntries.updateScore).toHaveBeenCalledWith('entry-1', 8.5);
  });

  it('crea la entry como VISITED si no existía', async () => {
    await useCase.execute(input);
    expect(siteEntries.upsertStatus).toHaveBeenCalledWith({
      userId: 'user-1',
      siteId: 'site-1',
      status: 'VISITED',
    });
  });

  it('transiciona de WANT_TO_GO a VISITED', async () => {
    siteEntries.findByUserAndSite.mockResolvedValue(
      makeEntry({ status: 'WANT_TO_GO' }),
    );
    await useCase.execute(input);
    expect(siteEntries.upsertStatus).toHaveBeenCalled();
  });

  it('reutiliza una entry ya VISITED sin puntuar (no la vuelve a crear)', async () => {
    siteEntries.findByUserAndSite.mockResolvedValue(
      makeEntry({ status: 'VISITED', score: null }),
    );
    await useCase.execute(input);
    expect(siteEntries.upsertStatus).not.toHaveBeenCalled();
    expect(siteEntries.listRankedBucket).toHaveBeenCalledWith(
      'user-1',
      { min: 7, max: 10 },
      'entry-1',
    );
  });

  it('bucket no vacío: devuelve la primera comparación en vez de puntuar', async () => {
    siteEntries.listRankedBucket.mockResolvedValue([
      { id: 'entry-2', siteId: 'site-2', score: 8 },
    ]);

    const result = await useCase.execute(input);

    expect(result).toEqual({ done: false, lo: 0, hi: 1, compareWithSiteId: 'site-2' });
    expect(siteEntries.updateScore).not.toHaveBeenCalled();
  });
});
