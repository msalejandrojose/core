import { Track, TrackTheme } from '../../domain/entities/track.entity';
import { TrackCell } from '../../domain/track-path';
import {
  CreateTrackData,
  TrackRepositoryPort,
} from '../ports/track-repository.port';
import { AdminCreateTrackUseCase } from './admin-create-track.use-case';

// Rectángulo 2x3 con la celda 0 a mitad de un lado recto (no en una esquina),
// para que pase también la regla de "meta en recta".
const VALID_PATH: TrackCell[] = [
  { x: 0, y: 1 },
  { x: 0, y: 2 },
  { x: 1, y: 2 },
  { x: 2, y: 2 },
  { x: 2, y: 1 },
  { x: 2, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 0 },
];

class FakeTrackRepository implements TrackRepositoryPort {
  readonly created: CreateTrackData[] = [];
  private slugs = new Set<string>();

  findBySlug(): Promise<Track | null> {
    return Promise.resolve(null);
  }
  findById(): Promise<Track | null> {
    return Promise.resolve(null);
  }
  existsSlug(slug: string): Promise<boolean> {
    return Promise.resolve(this.slugs.has(slug));
  }
  listActive(): Promise<never> {
    throw new Error('not used in this test');
  }
  listAll(): Promise<never> {
    throw new Error('not used in this test');
  }
  update(): Promise<never> {
    throw new Error('not used in this test');
  }
  create(data: CreateTrackData): Promise<Track> {
    this.created.push(data);
    this.slugs.add(data.slug);
    return Promise.resolve(
      new Track(
        'new-id',
        data.slug,
        data.name,
        data.sectorCount,
        data.minPlausibleMs,
        data.isActive,
        data.path,
        data.theme,
        data.grip,
      ),
    );
  }
}

function input(
  overrides: Partial<Parameters<AdminCreateTrackUseCase['execute']>[0]> = {},
) {
  return {
    slug: 'circuito-nuevo',
    name: 'Circuito Nuevo',
    sectorCount: 4,
    minPlausibleMs: 9000,
    path: VALID_PATH,
    theme: TrackTheme.MEADOW,
    grip: 1.0,
    ...overrides,
  };
}

describe('AdminCreateTrackUseCase', () => {
  it('crea el circuito cuando el trazado y el slug son válidos', async () => {
    const repo = new FakeTrackRepository();
    const useCase = new AdminCreateTrackUseCase(repo);

    const track = await useCase.execute(input());

    expect(track.slug).toBe('circuito-nuevo');
    expect(repo.created).toHaveLength(1);
  });

  it('rechaza un trazado que no cumple las reglas del dominio', async () => {
    const repo = new FakeTrackRepository();
    const useCase = new AdminCreateTrackUseCase(repo);

    await expect(
      useCase.execute(
        input({
          path: [
            { x: 0, y: 0 },
            { x: 0, y: 1 },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: 'RACING_INVALID_TRACK_PATH' });
    expect(repo.created).toHaveLength(0);
  });

  it('rechaza un slug ya existente', async () => {
    const repo = new FakeTrackRepository();
    await repo.create({ ...input(), isActive: true });

    const useCase = new AdminCreateTrackUseCase(repo);

    await expect(useCase.execute(input())).rejects.toMatchObject({
      code: 'RACING_TRACK_SLUG_ALREADY_EXISTS',
    });
  });

  it('por defecto crea el circuito activo', async () => {
    const repo = new FakeTrackRepository();
    const useCase = new AdminCreateTrackUseCase(repo);

    await useCase.execute(input());

    expect(repo.created[0].isActive).toBe(true);
  });
});
