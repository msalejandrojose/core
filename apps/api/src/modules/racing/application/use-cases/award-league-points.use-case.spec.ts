import { RacingLeagueConfigKey } from '../../domain/entities/racing-league-config.entity';
import {
  RacingLeagueStanding,
  RacingLeagueTier,
} from '../../domain/entities/racing-league-standing.entity';
import { Season } from '../../domain/entities/season.entity';
import { RacingLeagueConfigRepositoryPort } from '../ports/racing-league-config-repository.port';
import { RacingLeagueRepositoryPort } from '../ports/racing-league-repository.port';
import { SeasonRepositoryPort } from '../ports/season-repository.port';
import { AwardLeaguePointsUseCase } from './award-league-points.use-case';

const SEASON = new Season('season-1', 'Temporada 1', new Date('2026-01-01'), null);

const AMOUNTS = new Map<RacingLeagueConfigKey, number>([
  [RacingLeagueConfigKey.POINTS_FIRST_PLACE, 10],
  [RacingLeagueConfigKey.POINTS_SECOND_PLACE, 5],
  [RacingLeagueConfigKey.POINTS_THIRD_PLACE, 1],
  [RacingLeagueConfigKey.TIER_SILVER_THRESHOLD, 50],
  [RacingLeagueConfigKey.TIER_GOLD_THRESHOLD, 150],
  [RacingLeagueConfigKey.TIER_PLATINUM_THRESHOLD, 350],
  [RacingLeagueConfigKey.TIER_DIAMOND_THRESHOLD, 700],
]);

class FakeSeasonRepository implements Partial<SeasonRepositoryPort> {
  constructor(private readonly current: Season | null) {}
  findCurrent(): Promise<Season | null> {
    return Promise.resolve(this.current);
  }
}

class FakeRacingLeagueConfigRepository
  implements Partial<RacingLeagueConfigRepositoryPort>
{
  getAmounts() {
    return Promise.resolve(AMOUNTS);
  }
}

class FakeRacingLeagueRepository implements Partial<RacingLeagueRepositoryPort> {
  upserted: { userId: string; seasonId: string; points: number; tier: RacingLeagueTier } | null =
    null;

  constructor(private readonly existing: RacingLeagueStanding | null) {}

  findStanding(): Promise<RacingLeagueStanding | null> {
    return Promise.resolve(this.existing);
  }

  upsertStanding(
    userId: string,
    seasonId: string,
    data: { points: number; tier: RacingLeagueTier },
  ): Promise<RacingLeagueStanding> {
    this.upserted = { userId, seasonId, ...data };
    return Promise.resolve({ userId, seasonId, ...data });
  }
}

function buildUseCase(
  season: Season | null,
  existing: RacingLeagueStanding | null,
): { useCase: AwardLeaguePointsUseCase; standings: FakeRacingLeagueRepository } {
  const standings = new FakeRacingLeagueRepository(existing);
  const useCase = new AwardLeaguePointsUseCase(
    new FakeSeasonRepository(season) as unknown as SeasonRepositoryPort,
    new FakeRacingLeagueConfigRepository() as unknown as RacingLeagueConfigRepositoryPort,
    standings as unknown as RacingLeagueRepositoryPort,
  );
  return { useCase, standings };
}

describe('AwardLeaguePointsUseCase', () => {
  it('no hace nada si no hay temporada abierta', async () => {
    const { useCase, standings } = buildUseCase(null, null);

    await useCase.execute('user-1', 1);

    expect(standings.upserted).toBeNull();
  });

  it('no hace nada si la posición no puntúa (4º en adelante)', async () => {
    const { useCase, standings } = buildUseCase(SEASON, null);

    await useCase.execute('user-1', 4);

    expect(standings.upserted).toBeNull();
  });

  it('crea la fila a partir de 0 con los puntos de la primera carrera puntuable', async () => {
    const { useCase, standings } = buildUseCase(SEASON, null);

    await useCase.execute('user-1', 1);

    expect(standings.upserted).toEqual({
      userId: 'user-1',
      seasonId: 'season-1',
      points: 10,
      tier: RacingLeagueTier.BRONZE,
    });
  });

  it('acumula sobre los puntos existentes y sube de liga al cruzar el umbral', async () => {
    const existing: RacingLeagueStanding = {
      userId: 'user-1',
      seasonId: 'season-1',
      tier: RacingLeagueTier.BRONZE,
      points: 45,
    };
    const { useCase, standings } = buildUseCase(SEASON, existing);

    await useCase.execute('user-1', 1);

    expect(standings.upserted).toEqual({
      userId: 'user-1',
      seasonId: 'season-1',
      points: 55,
      tier: RacingLeagueTier.SILVER,
    });
  });
});
