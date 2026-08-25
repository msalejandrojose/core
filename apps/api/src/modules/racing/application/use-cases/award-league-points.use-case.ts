import { Inject, Injectable } from '@nestjs/common';
import { leaguePointsForPosition } from '../../domain/racing-league-points';
import { tierForPoints, tierThresholdsFromConfig } from '../../domain/racing-league-tier';
import {
  RACING_LEAGUE_CONFIG_REPOSITORY,
  type RacingLeagueConfigRepositoryPort,
} from '../ports/racing-league-config-repository.port';
import {
  RACING_LEAGUE_REPOSITORY,
  type RacingLeagueRepositoryPort,
} from '../ports/racing-league-repository.port';
import { SEASON_REPOSITORY, type SeasonRepositoryPort } from '../ports/season-repository.port';

// Sin temporada abierta no hay dónde acumular puntos de liga — no es un
// error, el feature puede estar desplegado antes de que exista la primera
// temporada (mismo criterio que `LapTime.seasonId` nullable).
@Injectable()
export class AwardLeaguePointsUseCase {
  constructor(
    @Inject(SEASON_REPOSITORY) private readonly seasons: SeasonRepositoryPort,
    @Inject(RACING_LEAGUE_CONFIG_REPOSITORY)
    private readonly configs: RacingLeagueConfigRepositoryPort,
    @Inject(RACING_LEAGUE_REPOSITORY)
    private readonly standings: RacingLeagueRepositoryPort,
  ) {}

  async execute(userId: string, position: number): Promise<void> {
    const season = await this.seasons.findCurrent();
    if (!season) return;

    const amounts = await this.configs.getAmounts();
    const points = leaguePointsForPosition(position, amounts);
    if (points === 0) return;

    const standing = await this.standings.findStanding(userId, season.id);
    const newPoints = (standing?.points ?? 0) + points;
    const newTier = tierForPoints(newPoints, tierThresholdsFromConfig(amounts));

    await this.standings.upsertStanding(userId, season.id, {
      points: newPoints,
      tier: newTier,
    });
  }
}
