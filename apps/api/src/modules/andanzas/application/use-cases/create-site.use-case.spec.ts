import { CreateSiteUseCase } from './create-site.use-case';
import { TooManyTagsError } from '../../domain/errors/too-many-tags.error';

describe('CreateSiteUseCase', () => {
  let sites: { create: jest.Mock };
  let tags: { upsertByName: jest.Mock };
  let useCase: CreateSiteUseCase;

  beforeEach(() => {
    sites = { create: jest.fn().mockResolvedValue({ id: 'site-1' }) };
    tags = {
      upsertByName: jest
        .fn()
        .mockImplementation((name: string) => Promise.resolve({ id: `tag-${name}`, name })),
    };
    useCase = new CreateSiteUseCase(sites as never, tags as never);
  });

  const baseInput = {
    createdByUserId: 'user-1',
    name: 'Chiringuito de la playa',
    category: 'RESTAURANT' as const,
    latitude: 36.5,
    longitude: -4.9,
  };

  it('crea el sitio sin tags', async () => {
    await useCase.execute(baseInput);

    expect(sites.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: baseInput.name, tagIds: [] }),
    );
    expect(tags.upsertByName).not.toHaveBeenCalled();
  });

  it('normaliza y upsertea cada tag antes de crear el sitio', async () => {
    await useCase.execute({ ...baseInput, tagNames: [' Playa ', 'PLAYA', 'vistas'] });

    // "Playa" y "PLAYA" normalizan igual → un solo upsert para ese nombre
    expect(tags.upsertByName).toHaveBeenCalledTimes(2);
    expect(tags.upsertByName).toHaveBeenCalledWith('playa');
    expect(tags.upsertByName).toHaveBeenCalledWith('vistas');
    expect(sites.create).toHaveBeenCalledWith(
      expect.objectContaining({ tagIds: ['tag-playa', 'tag-vistas'] }),
    );
  });

  it('descarta nombres de tag vacíos tras normalizar', async () => {
    await useCase.execute({ ...baseInput, tagNames: ['   ', 'playa'] });

    expect(tags.upsertByName).toHaveBeenCalledTimes(1);
    expect(tags.upsertByName).toHaveBeenCalledWith('playa');
  });

  it('rechaza más de MAX_TAGS_PER_SITE etiquetas', async () => {
    const tooMany = Array.from({ length: 9 }, (_, i) => `tag-${i}`);

    await expect(
      useCase.execute({ ...baseInput, tagNames: tooMany }),
    ).rejects.toThrow(TooManyTagsError);
    expect(sites.create).not.toHaveBeenCalled();
  });
});
