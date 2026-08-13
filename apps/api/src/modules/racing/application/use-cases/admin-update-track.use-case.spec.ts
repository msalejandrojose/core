import { Track, TrackTheme } from '../../domain/entities/track.entity';
import { TrackCell } from '../../domain/track-path';
import {
  TrackRepositoryPort,
  UpdateTrackPatch,
} from '../ports/track-repository.port';
import { AdminUpdateTrackUseCase } from './admin-update-track.use-case';

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

const EXISTING = new Track(
  'track-1',
  'circuito-existente',
  'Circuito Existente',
  4,
  9000,
  true,
  VALID_PATH,
  TrackTheme.MEADOW,
  1.0,
);

class FakeTrackRepository implements TrackRepositoryPort {
  updated: { id: string; patch: UpdateTrackPatch } | null = null;

  constructor(private readonly existing: Track | null) {}

  findBySlug(): Promise<Track | null> {
    return Promise.resolve(null);
  }
  findById(): Promise<Track | null> {
    return Promise.resolve(this.existing);
  }
  existsSlug(): Promise<boolean> {
    return Promise.resolve(false);
  }
  listActive(): Promise<never> {
    throw new Error('not used in this test');
  }
  listAll(): Promise<never> {
    throw new Error('not used in this test');
  }
  create(): Promise<never> {
    throw new Error('not used in this test');
  }
  update(id: string, patch: UpdateTrackPatch): Promise<Track> {
    this.updated = { id, patch };
    return Promise.resolve(this.existing as Track);
  }
}

describe('AdminUpdateTrackUseCase', () => {
  it('lanza TrackNotFoundError si el circuito no existe', async () => {
    const repo = new FakeTrackRepository(null);
    const useCase = new AdminUpdateTrackUseCase(repo);

    await expect(
      useCase.execute('missing-id', { name: 'X' }),
    ).rejects.toMatchObject({ code: 'RACING_TRACK_NOT_FOUND' });
  });

  it('permite activar/desactivar sin tocar el trazado', async () => {
    const repo = new FakeTrackRepository(EXISTING);
    const useCase = new AdminUpdateTrackUseCase(repo);

    await useCase.execute('track-1', { isActive: false });

    expect(repo.updated).toEqual({
      id: 'track-1',
      patch: {
        name: undefined,
        sectorCount: undefined,
        minPlausibleMs: undefined,
        path: undefined,
        theme: undefined,
        grip: undefined,
        isActive: false,
      },
    });
  });

  it('rechaza un path nuevo que no cumple las reglas del dominio', async () => {
    const repo = new FakeTrackRepository(EXISTING);
    const useCase = new AdminUpdateTrackUseCase(repo);

    await expect(
      useCase.execute('track-1', {
        path: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
        ],
      }),
    ).rejects.toMatchObject({ code: 'RACING_INVALID_TRACK_PATH' });
    expect(repo.updated).toBeNull();
  });

  it('acepta un path nuevo válido', async () => {
    const repo = new FakeTrackRepository(EXISTING);
    const useCase = new AdminUpdateTrackUseCase(repo);
    // Rotado 2 posiciones: (1,2) también cae a mitad de un lado recto, así
    // que sigue siendo un trazado válido con otra celda de salida.
    const rotated = [...VALID_PATH.slice(2), ...VALID_PATH.slice(0, 2)];

    await useCase.execute('track-1', { path: rotated });

    expect(repo.updated?.patch.path).toEqual(rotated);
  });
});
