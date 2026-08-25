import { GrandPrix } from '../../domain/entities/grand-prix.entity';
import { Track, TrackTheme } from '../../domain/entities/track.entity';
import {
  CreateGrandPrixData,
  GrandPrixRepositoryPort,
} from '../ports/grand-prix-repository.port';
import { TrackRepositoryPort } from '../ports/track-repository.port';
import { AdminCreateGrandPrixUseCase } from './admin-create-grand-prix.use-case';

function track(id: string, isActive = true): Track {
  return new Track(
    id,
    `slug-${id}`,
    `Track ${id}`,
    `circuit-${id}`,
    3,
    5000,
    isActive,
    [],
    TrackTheme.MEADOW,
    1.0,
    null,
    `slug-${id}`,
    `Track ${id}`,
  );
}

class FakeGrandPrixRepository implements Partial<GrandPrixRepositoryPort> {
  readonly created: CreateGrandPrixData[] = [];
  private slugs = new Set<string>();

  existsSlug(slug: string): Promise<boolean> {
    return Promise.resolve(this.slugs.has(slug));
  }
  create(data: CreateGrandPrixData): Promise<GrandPrix> {
    this.created.push(data);
    this.slugs.add(data.slug);
    return Promise.resolve(
      new GrandPrix('new-id', data.slug, data.name, data.isActive, []),
    );
  }
}

class FakeTrackRepository implements Partial<TrackRepositoryPort> {
  constructor(private readonly tracks: Map<string, Track>) {}
  findById(id: string): Promise<Track | null> {
    return Promise.resolve(this.tracks.get(id) ?? null);
  }
}

function input(
  overrides: Partial<{
    slug: string;
    name: string;
    isActive?: boolean;
    trackIds: string[];
  }> = {},
) {
  return {
    slug: 'copa-verano',
    name: 'Copa de Verano',
    trackIds: ['track-1', 'track-2'],
    ...overrides,
  };
}

function useCase(tracks: Track[]) {
  const grandPrixes = new FakeGrandPrixRepository();
  const useCase = new AdminCreateGrandPrixUseCase(
    grandPrixes as unknown as GrandPrixRepositoryPort,
    new FakeTrackRepository(
      new Map(tracks.map((t) => [t.id, t])),
    ) as unknown as TrackRepositoryPort,
  );
  return { useCase, grandPrixes };
}

describe('AdminCreateGrandPrixUseCase', () => {
  it('crea el Grand Prix con las mangas en orden', async () => {
    const { useCase: uc, grandPrixes } = useCase([
      track('track-1'),
      track('track-2'),
    ]);

    await uc.execute(input());

    expect(grandPrixes.created).toEqual([
      {
        slug: 'copa-verano',
        name: 'Copa de Verano',
        isActive: true,
        stages: [
          { trackId: 'track-1', order: 0 },
          { trackId: 'track-2', order: 1 },
        ],
      },
    ]);
  });

  it('rechaza un slug ya existente', async () => {
    const { useCase: uc, grandPrixes } = useCase([
      track('track-1'),
      track('track-2'),
    ]);
    await grandPrixes.create({
      slug: 'copa-verano',
      name: 'x',
      isActive: true,
      stages: [],
    });

    await expect(uc.execute(input())).rejects.toMatchObject({
      code: 'RACING_GRAND_PRIX_SLUG_ALREADY_EXISTS',
    });
  });

  it('rechaza menos de dos circuitos', async () => {
    const { useCase: uc } = useCase([track('track-1')]);

    await expect(
      uc.execute(input({ trackIds: ['track-1'] })),
    ).rejects.toMatchObject({ code: 'RACING_INVALID_GRAND_PRIX_STAGES' });
  });

  it('rechaza un circuito que no existe', async () => {
    const { useCase: uc } = useCase([track('track-1')]);

    await expect(
      uc.execute(input({ trackIds: ['track-1', 'track-missing'] })),
    ).rejects.toMatchObject({ code: 'RACING_INVALID_GRAND_PRIX_STAGES' });
  });

  it('rechaza un circuito repetido', async () => {
    const { useCase: uc } = useCase([track('track-1')]);

    await expect(
      uc.execute(input({ trackIds: ['track-1', 'track-1'] })),
    ).rejects.toMatchObject({ code: 'RACING_INVALID_GRAND_PRIX_STAGES' });
  });

  it('rechaza un circuito inactivo', async () => {
    const { useCase: uc } = useCase([
      track('track-1'),
      track('track-2', false),
    ]);

    await expect(uc.execute(input())).rejects.toMatchObject({
      code: 'RACING_INVALID_GRAND_PRIX_STAGES',
    });
  });
});
