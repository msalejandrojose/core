import { LeaderboardEntry } from '../../domain/entities/lap-time.entity';
import { Season } from '../../domain/entities/season.entity';
import { Track } from '../../domain/entities/track.entity';
import { LapTimeRepositoryPort } from '../ports/lap-time-repository.port';
import { SeasonRepositoryPort } from '../ports/season-repository.port';
import { TrackRepositoryPort } from '../ports/track-repository.port';
import { GetLeaderboardUseCase } from './get-leaderboard.use-case';

const TRACK = new Track('track-1', 'kenney-01', 'Kenney', 4, 8000, true);
const CURRENT_SEASON = new Season('season-current', 'Actual', new Date(), null);
const PAST_SEASON = new Season(
  'season-past',
  'Pasada',
  new Date('2026-01-01'),
  new Date('2026-02-01'),
);

class FakeTrackRepository implements Partial<TrackRepositoryPort> {
  findBySlug(): Promise<Track | null> {
    return Promise.resolve(TRACK);
  }
}

class FakeSeasonRepository implements Partial<SeasonRepositoryPort> {
  constructor(
    private readonly current: Season | null,
    private readonly byId: Record<string, Season> = {},
  ) {}

  findCurrent(): Promise<Season | null> {
    return Promise.resolve(this.current);
  }

  findById(id: string): Promise<Season | null> {
    return Promise.resolve(this.byId[id] ?? null);
  }
}

class FakeLapTimeRepository implements Partial<LapTimeRepositoryPort> {
  lastSeasonIdArgs: (string | null | undefined)[] = [];

  leaderboard(
    _trackId: string,
    _limit: number,
    seasonId?: string | null,
  ): Promise<LeaderboardEntry[]> {
    this.lastSeasonIdArgs.push(seasonId);
    return Promise.resolve([]);
  }

  positionOf(
    _trackId: string,
    _userId: string,
    seasonId?: string | null,
  ): Promise<number | null> {
    this.lastSeasonIdArgs.push(seasonId);
    return Promise.resolve(null);
  }
}

function useCase(current: Season | null, byId: Record<string, Season> = {}) {
  const laps = new FakeLapTimeRepository();
  return {
    useCase: new GetLeaderboardUseCase(
      new FakeTrackRepository() as unknown as TrackRepositoryPort,
      laps as unknown as LapTimeRepositoryPort,
      new FakeSeasonRepository(current, byId) as unknown as SeasonRepositoryPort,
    ),
    laps,
  };
}

describe('GetLeaderboardUseCase — temporada (TASK-227)', () => {
  it('sin pedir temporada y sin ninguna abierta, no acota (histórico completo)', async () => {
    const { useCase: uc, laps } = useCase(null);

    const result = await uc.execute('kenney-01', 'user-1', 20);

    expect(result.seasonId).toBeNull();
    expect(laps.lastSeasonIdArgs).toEqual([null, null]);
  });

  it('sin pedir temporada pero con una abierta, acota a la actual', async () => {
    const { useCase: uc, laps } = useCase(CURRENT_SEASON);

    const result = await uc.execute('kenney-01', 'user-1', 20);

    expect(result.seasonId).toBe('season-current');
    expect(laps.lastSeasonIdArgs).toEqual(['season-current', 'season-current']);
  });

  it('pidiendo una temporada concreta, acota a esa aunque no sea la actual', async () => {
    const { useCase: uc, laps } = useCase(CURRENT_SEASON, {
      'season-past': PAST_SEASON,
    });

    const result = await uc.execute('kenney-01', 'user-1', 20, 'season-past');

    expect(result.seasonId).toBe('season-past');
    expect(laps.lastSeasonIdArgs).toEqual(['season-past', 'season-past']);
  });

  it('pidiendo una temporada que no existe, falla claro en vez de caer al histórico', async () => {
    const { useCase: uc } = useCase(CURRENT_SEASON);

    await expect(
      uc.execute('kenney-01', 'user-1', 20, 'no-existe'),
    ).rejects.toThrow();
  });
});
