import { GhostSnapshot } from '../../domain/entities/ghost-snapshot';
import { LapTime } from '../../domain/entities/lap-time.entity';
import { Track } from '../../domain/entities/track.entity';
import {
  CreateLapTimeData,
  LapTimeRepositoryPort,
} from '../ports/lap-time-repository.port';
import { TrackRepositoryPort } from '../ports/track-repository.port';
import { SubmitLapTimeUseCase } from './submit-lap-time.use-case';

const TRACK = new Track('track-1', 'kenney-01', 'Kenney', 4, 8000, true);

const SNAPSHOTS: GhostSnapshot[] = [
  { t: 0, pos: { x: 0, y: 0, z: 0 }, yaw: 0 },
  { t: 500, pos: { x: 1, y: 0, z: 0 }, yaw: 0 },
];

class FakeTrackRepository implements Partial<TrackRepositoryPort> {
  findBySlug(): Promise<Track | null> {
    return Promise.resolve(TRACK);
  }
}

class FakeLapTimeRepository implements Partial<LapTimeRepositoryPort> {
  readonly created: CreateLapTimeData[] = [];
  constructor(private readonly previousBest: LapTime | null) {}

  findPersonalBest(): Promise<LapTime | null> {
    return Promise.resolve(this.previousBest);
  }
  findLastAttemptAt(): Promise<Date | null> {
    return Promise.resolve(null);
  }
  positionOf(): Promise<number | null> {
    return Promise.resolve(1);
  }
  create(data: CreateLapTimeData): Promise<LapTime> {
    this.created.push(data);
    return Promise.resolve(
      new LapTime(
        'new-id',
        data.userId,
        data.trackId,
        data.durationMs,
        data.splitsMs,
        data.clientVersion,
        new Date(),
        null,
        data.ghostSnapshots ?? null,
      ),
    );
  }
}

function input(
  overrides: Partial<{
    durationMs: number;
    splitsMs: number[];
    ghostSnapshots: GhostSnapshot[];
  }> = {},
) {
  return {
    userId: 'user-1',
    trackSlug: 'kenney-01',
    durationMs: 10000,
    splitsMs: [2500, 5000, 7500, 10000],
    clientVersion: '0.1.0',
    ...overrides,
  };
}

function useCase(previousBest: LapTime | null) {
  const laps = new FakeLapTimeRepository(previousBest);
  return {
    useCase: new SubmitLapTimeUseCase(
      new FakeTrackRepository() as unknown as TrackRepositoryPort,
      laps as unknown as LapTimeRepositoryPort,
    ),
    laps,
  };
}

describe('SubmitLapTimeUseCase — fantasma (TASK-221)', () => {
  it('guarda el fantasma cuando la vuelta es la primera marca del jugador', async () => {
    const { useCase: uc, laps } = useCase(null);

    await uc.execute(input({ ghostSnapshots: SNAPSHOTS }));

    expect(laps.created[0].ghostSnapshots).toEqual(SNAPSHOTS);
  });

  it('guarda el fantasma cuando la vuelta bate la marca anterior', async () => {
    const previous = new LapTime(
      'prev',
      'user-1',
      'track-1',
      12000,
      [3000, 6000, 9000, 12000],
      '0.1.0',
      new Date(),
    );
    const { useCase: uc, laps } = useCase(previous);

    await uc.execute(input({ durationMs: 10000, ghostSnapshots: SNAPSHOTS }));

    expect(laps.created[0].ghostSnapshots).toEqual(SNAPSHOTS);
  });

  it('NO guarda el fantasma cuando la vuelta no bate la marca anterior', async () => {
    const previous = new LapTime(
      'prev',
      'user-1',
      'track-1',
      8000,
      [2000, 4000, 6000, 8000],
      '0.1.0',
      new Date(),
    );
    const { useCase: uc, laps } = useCase(previous);

    await uc.execute(input({ durationMs: 10000, ghostSnapshots: SNAPSHOTS }));

    expect(laps.created[0].ghostSnapshots).toBeUndefined();
  });

  it('sin fantasma enviado, no se guarda ninguno aunque sea récord', async () => {
    const { useCase: uc, laps } = useCase(null);

    await uc.execute(input());

    expect(laps.created[0].ghostSnapshots).toBeUndefined();
  });
});
