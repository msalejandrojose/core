import { Track, TrackTheme } from '../../domain/entities/track.entity';
import {
  TrackRepositoryPort,
  UpdateTrackPatch,
} from '../ports/track-repository.port';
import { AdminUpdateTrackUseCase } from './admin-update-track.use-case';

const EXISTING = new Track(
  'track-1',
  'circuito-existente-150cc-normal',
  'Circuito Existente · 150cc · Normal',
  'circuit-1',
  4,
  9000,
  true,
  [],
  TrackTheme.MEADOW,
  1.0,
  null,
  'circuito-existente',
  'Circuito Existente',
);

class FakeTrackRepository implements Partial<TrackRepositoryPort> {
  updated: { id: string; patch: UpdateTrackPatch } | null = null;

  constructor(private readonly existing: Track | null) {}

  findById(): Promise<Track | null> {
    return Promise.resolve(this.existing);
  }

  update(id: string, patch: UpdateTrackPatch): Promise<Track> {
    this.updated = { id, patch };
    return Promise.resolve(this.existing as Track);
  }
}

describe('AdminUpdateTrackUseCase', () => {
  it('lanza TrackNotFoundError si la variante no existe', async () => {
    const repo = new FakeTrackRepository(null);
    const useCase = new AdminUpdateTrackUseCase(
      repo as unknown as TrackRepositoryPort,
    );

    await expect(
      useCase.execute('missing-id', { name: 'X' }),
    ).rejects.toMatchObject({ code: 'RACING_TRACK_NOT_FOUND' });
  });

  it('permite activar/desactivar esta variante', async () => {
    const repo = new FakeTrackRepository(EXISTING);
    const useCase = new AdminUpdateTrackUseCase(
      repo as unknown as TrackRepositoryPort,
    );

    await useCase.execute('track-1', { isActive: false });

    expect(repo.updated).toEqual({
      id: 'track-1',
      patch: {
        name: undefined,
        sectorCount: undefined,
        minPlausibleMs: undefined,
        isActive: false,
      },
    });
  });

  it('permite ajustar sectorCount/minPlausibleMs/name', async () => {
    const repo = new FakeTrackRepository(EXISTING);
    const useCase = new AdminUpdateTrackUseCase(
      repo as unknown as TrackRepositoryPort,
    );

    await useCase.execute('track-1', {
      name: 'Nuevo nombre',
      sectorCount: 5,
      minPlausibleMs: 9500,
    });

    expect(repo.updated).toEqual({
      id: 'track-1',
      patch: {
        name: 'Nuevo nombre',
        sectorCount: 5,
        minPlausibleMs: 9500,
        isActive: undefined,
      },
    });
  });
});
