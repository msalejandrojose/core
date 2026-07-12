import { SetSiteEntryStatusUseCase } from './set-site-entry-status.use-case';
import { SiteNotFoundError } from '../../domain/errors/site-not-found.error';
import { InvalidSiteEntryTransitionError } from '../../domain/errors/invalid-site-entry-transition.error';

describe('SetSiteEntryStatusUseCase', () => {
  let sites: { findById: jest.Mock };
  let siteEntries: { findByUserAndSite: jest.Mock; upsertStatus: jest.Mock };
  let useCase: SetSiteEntryStatusUseCase;

  beforeEach(() => {
    sites = { findById: jest.fn().mockResolvedValue({ id: 'site-1' }) };
    siteEntries = {
      findByUserAndSite: jest.fn().mockResolvedValue(null),
      upsertStatus: jest.fn().mockResolvedValue({ id: 'entry-1', status: 'WANT_TO_GO' }),
    };
    useCase = new SetSiteEntryStatusUseCase(siteEntries as never, sites as never);
  });

  const input = { userId: 'user-1', siteId: 'site-1', status: 'WANT_TO_GO' as const };

  it('rechaza si el sitio no existe', async () => {
    sites.findById.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toThrow(SiteNotFoundError);
  });

  it('crea la entry directamente como WANT_TO_GO', async () => {
    await useCase.execute(input);
    expect(siteEntries.upsertStatus).toHaveBeenCalledWith({
      userId: 'user-1',
      siteId: 'site-1',
      status: 'WANT_TO_GO',
    });
  });

  it('permite crear directamente como VISITED (sin puntuar)', async () => {
    await useCase.execute({ ...input, status: 'VISITED' });
    expect(siteEntries.upsertStatus).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'VISITED' }),
    );
  });

  it('rechaza VISITED → WANT_TO_GO (no soportado en el MVP)', async () => {
    siteEntries.findByUserAndSite.mockResolvedValue({ status: 'VISITED' });
    await expect(useCase.execute(input)).rejects.toThrow(
      InvalidSiteEntryTransitionError,
    );
    expect(siteEntries.upsertStatus).not.toHaveBeenCalled();
  });

  it('rechaza quedarse en el mismo estado', async () => {
    siteEntries.findByUserAndSite.mockResolvedValue({ status: 'WANT_TO_GO' });
    await expect(useCase.execute(input)).rejects.toThrow(
      InvalidSiteEntryTransitionError,
    );
  });
});
