import { GhostSnapshot } from '../../domain/entities/ghost-snapshot';
import { LapTime } from '../../domain/entities/lap-time.entity';
import { Track } from '../../domain/entities/track.entity';
import { LapTimeRepositoryPort } from '../ports/lap-time-repository.port';
import { TrackRepositoryPort } from '../ports/track-repository.port';
import { GetGhostUseCase } from './get-ghost.use-case';

const TRACK = new Track('track-1', 'kenney-01', 'Kenney', 4, 8000, true);

const SNAPSHOTS: GhostSnapshot[] = [
  { t: 0, pos: { x: 0, y: 0, z: 0 }, yaw: 0 },
];

class FakeTrackRepository implements Partial<TrackRepositoryPort> {
  constructor(private readonly track: Track | null) {}
  findBySlug(): Promise<Track | null> {
    return Promise.resolve(this.track);
  }
}

class FakeLapTimeRepository implements Partial<LapTimeRepositoryPort> {
  constructor(private readonly best: LapTime | null) {}
  findPersonalBest(): Promise<LapTime | null> {
    return Promise.resolve(this.best);
  }
}

function useCase(track: Track | null, best: LapTime | null) {
  return new GetGhostUseCase(
    new FakeTrackRepository(track) as unknown as TrackRepositoryPort,
    new FakeLapTimeRepository(best) as unknown as LapTimeRepositoryPort,
  );
}

describe('GetGhostUseCase', () => {
  it('rechaza un circuito que no existe', async () => {
    const uc = useCase(null, null);
    await expect(uc.execute('no-existe', 'user-1')).rejects.toMatchObject({
      code: 'RACING_TRACK_NOT_FOUND',
    });
  });

  it('devuelve null si el jugador no tiene marca en ese circuito', async () => {
    const uc = useCase(TRACK, null);
    await expect(uc.execute('kenney-01', 'user-1')).resolves.toBeNull();
  });

  it('devuelve null si la marca no tiene fantasma grabado', async () => {
    const best = new LapTime(
      'lap-1',
      'user-1',
      'track-1',
      10000,
      [2500, 5000, 7500, 10000],
      '0.1.0',
      new Date(),
      null,
      null,
    );
    const uc = useCase(TRACK, best);
    await expect(uc.execute('kenney-01', 'user-1')).resolves.toBeNull();
  });

  it('devuelve el tiempo y las instantáneas cuando hay fantasma', async () => {
    const best = new LapTime(
      'lap-1',
      'user-1',
      'track-1',
      10000,
      [2500, 5000, 7500, 10000],
      '0.1.0',
      new Date(),
      null,
      SNAPSHOTS,
    );
    const uc = useCase(TRACK, best);
    await expect(uc.execute('kenney-01', 'user-1')).resolves.toEqual({
      durationMs: 10000,
      snapshots: SNAPSHOTS,
    });
  });
});
