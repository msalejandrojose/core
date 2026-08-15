import { GhostSnapshot } from '../../domain/entities/ghost-snapshot';
import { LapTime } from '../../domain/entities/lap-time.entity';
import { Track } from '../../domain/entities/track.entity';
import {
  LapTimeRepositoryPort,
  OnlineRaceGhostCandidates,
} from '../ports/lap-time-repository.port';
import { TrackRepositoryPort } from '../ports/track-repository.port';
import { MatchOnlineRaceUseCase } from './match-online-race.use-case';

const TRACK = new Track('track-1', 'kenney-01', 'Kenney', 4, 8000, true);
const PLAYER_ID = 'player-1';

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
  constructor(
    private readonly best: LapTime | null,
    private readonly candidates: OnlineRaceGhostCandidates = {
      target: null,
      threat: null,
    },
  ) {}
  findPersonalBest(): Promise<LapTime | null> {
    return Promise.resolve(this.best);
  }
  findGhostRivalCandidates(): Promise<OnlineRaceGhostCandidates> {
    return Promise.resolve(this.candidates);
  }
}

function useCase(
  track: Track | null,
  best: LapTime | null,
  candidates?: OnlineRaceGhostCandidates,
) {
  return new MatchOnlineRaceUseCase(
    new FakeTrackRepository(track) as unknown as TrackRepositoryPort,
    new FakeLapTimeRepository(
      best,
      candidates,
    ) as unknown as LapTimeRepositoryPort,
  );
}

function lapTime(durationMs: number, snapshots: GhostSnapshot[] | null) {
  return new LapTime(
    'lap-1',
    PLAYER_ID,
    'track-1',
    durationMs,
    [2000, 4000, 6000, durationMs],
    '0.1.0',
    new Date(),
    null,
    snapshots,
  );
}

describe('MatchOnlineRaceUseCase', () => {
  it('rechaza un circuito que no existe', async () => {
    const uc = useCase(null, null);
    await expect(uc.execute(PLAYER_ID, 'no-existe')).rejects.toMatchObject({
      code: 'RACING_TRACK_NOT_FOUND',
    });
  });

  it('sin marca propia, no hay rivales', async () => {
    const uc = useCase(TRACK, null);
    await expect(uc.execute(PLAYER_ID, 'kenney-01')).resolves.toEqual({
      trackId: 'track-1',
      target: null,
      threat: null,
    });
  });

  it('con ambos vecinos disponibles, arma la carrera completa', async () => {
    const uc = useCase(TRACK, lapTime(42000, SNAPSHOTS), {
      target: {
        userId: 'faster',
        durationMs: 41000,
        ghostSnapshots: SNAPSHOTS,
      },
      threat: {
        userId: 'slower',
        durationMs: 43000,
        ghostSnapshots: SNAPSHOTS,
      },
    });
    const result = await uc.execute(PLAYER_ID, 'kenney-01');

    expect(result.target?.userId).toBe('faster');
    expect(result.threat?.userId).toBe('slower');
  });

  it('sin vecino mejor, el objetivo es el propio fantasma', async () => {
    const uc = useCase(TRACK, lapTime(42000, SNAPSHOTS), {
      target: null,
      threat: {
        userId: 'slower',
        durationMs: 43000,
        ghostSnapshots: SNAPSHOTS,
      },
    });
    const result = await uc.execute(PLAYER_ID, 'kenney-01');

    expect(result.target?.userId).toBe(PLAYER_ID);
    expect(result.target?.durationMs).toBe(42000);
  });

  it('sin vecino peor, no hay amenaza', async () => {
    const uc = useCase(TRACK, lapTime(42000, SNAPSHOTS), {
      target: {
        userId: 'faster',
        durationMs: 41000,
        ghostSnapshots: SNAPSHOTS,
      },
      threat: null,
    });
    const result = await uc.execute(PLAYER_ID, 'kenney-01');

    expect(result.threat).toBeNull();
  });
});
