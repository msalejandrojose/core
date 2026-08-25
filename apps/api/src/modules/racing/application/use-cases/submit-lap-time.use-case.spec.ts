import { RacingCoinRewardKey } from '../../domain/entities/racing-coin-reward-config.entity';
import { GhostSnapshot } from '../../domain/entities/ghost-snapshot';
import { LapTime } from '../../domain/entities/lap-time.entity';
import { RacingCoinSource } from '../../domain/entities/racing-wallet.entity';
import { Season } from '../../domain/entities/season.entity';
import { Track, TrackTheme } from '../../domain/entities/track.entity';
import { RacingCoinRewardAmounts } from '../../domain/racing-coin-rewards';
import {
  CreateLapTimeData,
  LapTimeRepositoryPort,
} from '../ports/lap-time-repository.port';
import { RacingCoinRewardConfigRepositoryPort } from '../ports/racing-coin-reward-config-repository.port';
import {
  CreditCoinsData,
  RacingWalletRepositoryPort,
} from '../ports/racing-wallet-repository.port';
import { SeasonRepositoryPort } from '../ports/season-repository.port';
import { TrackRepositoryPort } from '../ports/track-repository.port';
import { SubmitLapTimeUseCase } from './submit-lap-time.use-case';

const DEFAULT_AMOUNTS: RacingCoinRewardAmounts = new Map([
  [RacingCoinRewardKey.PERSONAL_BEST, 50],
]);

const TRACK = new Track(
  'track-1',
  'kenney-01',
  'Kenney',
  'circuit-1',
  4,
  8000,
  true,
  [],
  TrackTheme.MEADOW,
  1.0,
  null,
  'kenney-01',
  'Kenney',
);

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

class FakeSeasonRepository implements Partial<SeasonRepositoryPort> {
  constructor(private readonly current: Season | null = null) {}

  findCurrent(): Promise<Season | null> {
    return Promise.resolve(this.current);
  }
}

class FakeRacingWalletRepository implements Partial<RacingWalletRepositoryPort> {
  credits: CreditCoinsData[] = [];

  credit(data: CreditCoinsData): Promise<number> {
    this.credits.push(data);
    return Promise.resolve(
      this.credits.reduce((sum, entry) => sum + entry.amount, 0),
    );
  }
}

class FakeRacingCoinRewardConfigRepository
  implements Partial<RacingCoinRewardConfigRepositoryPort>
{
  constructor(private readonly amounts: RacingCoinRewardAmounts = DEFAULT_AMOUNTS) {}

  getAmounts(): Promise<RacingCoinRewardAmounts> {
    return Promise.resolve(this.amounts);
  }
}

function useCase(
  previousBest: LapTime | null,
  currentSeason: Season | null = null,
  amounts: RacingCoinRewardAmounts = DEFAULT_AMOUNTS,
) {
  const laps = new FakeLapTimeRepository(previousBest);
  const wallets = new FakeRacingWalletRepository();
  return {
    useCase: new SubmitLapTimeUseCase(
      new FakeTrackRepository() as unknown as TrackRepositoryPort,
      laps as unknown as LapTimeRepositoryPort,
      new FakeSeasonRepository(currentSeason) as unknown as SeasonRepositoryPort,
      wallets as unknown as RacingWalletRepositoryPort,
      new FakeRacingCoinRewardConfigRepository(
        amounts,
      ) as unknown as RacingCoinRewardConfigRepositoryPort,
    ),
    laps,
    wallets,
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

describe('SubmitLapTimeUseCase — temporada (TASK-227)', () => {
  it('sin temporada abierta, la vuelta se guarda igual sin season_id', async () => {
    const { useCase: uc, laps } = useCase(null, null);

    await uc.execute(input());

    expect(laps.created[0].seasonId).toBeNull();
  });

  it('con una temporada abierta, la vuelta queda sellada con su id', async () => {
    const season = new Season('season-1', 'Temporada 1', new Date(), null);
    const { useCase: uc, laps } = useCase(null, season);

    await uc.execute(input());

    expect(laps.created[0].seasonId).toBe('season-1');
  });
});

describe('SubmitLapTimeUseCase — bono de récord personal (TASK-321)', () => {
  it('NO acredita nada en la primera vuelta subida a un circuito', async () => {
    const { useCase: uc, wallets } = useCase(null);

    await uc.execute(input());

    expect(wallets.credits).toHaveLength(0);
  });

  it('NO acredita nada si la vuelta no bate la marca anterior', async () => {
    const previous = new LapTime(
      'prev',
      'user-1',
      'track-1',
      8000,
      [2000, 4000, 6000, 8000],
      '0.1.0',
      new Date(),
    );
    const { useCase: uc, wallets } = useCase(previous);

    await uc.execute(input({ durationMs: 10000 }));

    expect(wallets.credits).toHaveLength(0);
  });

  it('acredita 50 monedas cuando la vuelta bate una marca anterior de verdad', async () => {
    const previous = new LapTime(
      'prev',
      'user-1',
      'track-1',
      12000,
      [3000, 6000, 9000, 12000],
      '0.1.0',
      new Date(),
    );
    const { useCase: uc, wallets } = useCase(previous);

    await uc.execute(input({ durationMs: 10000 }));

    expect(wallets.credits).toEqual([
      {
        userId: 'user-1',
        amount: 50,
        source: RacingCoinSource.PERSONAL_BEST,
        lapTimeId: 'new-id',
      },
    ]);
  });

  it('con el importe configurado a 0, no acredita nada aunque bata la marca', async () => {
    const previous = new LapTime(
      'prev',
      'user-1',
      'track-1',
      12000,
      [3000, 6000, 9000, 12000],
      '0.1.0',
      new Date(),
    );
    const { useCase: uc, wallets } = useCase(
      previous,
      null,
      new Map([[RacingCoinRewardKey.PERSONAL_BEST, 0]]),
    );

    await uc.execute(input({ durationMs: 10000 }));

    expect(wallets.credits).toHaveLength(0);
  });
});
