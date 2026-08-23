import { Inject, Injectable } from '@nestjs/common';
import {
  RacingLeagueStanding,
  RacingLeagueTier,
} from '../../domain/entities/racing-league-standing.entity';
import {
  RACING_LEAGUE_REPOSITORY,
  type RacingLeagueRepositoryPort,
} from '../ports/racing-league-repository.port';
import { SEASON_REPOSITORY, type SeasonRepositoryPort } from '../ports/season-repository.port';

// Bronce/0 es la respuesta normal, no un error: cubre tanto "sin temporada
// abierta todavía" como "temporada abierta pero sin carreras puntuables
// jugadas esta vez" — mismo criterio que `GetWalletBalanceUseCase`.
@Injectable()
export class GetMyLeagueStandingUseCase {
  constructor(
    @Inject(SEASON_REPOSITORY) private readonly seasons: SeasonRepositoryPort,
    @Inject(RACING_LEAGUE_REPOSITORY)
    private readonly standings: RacingLeagueRepositoryPort,
  ) {}

  async execute(userId: string): Promise<RacingLeagueStanding | null> {
    const season = await this.seasons.findCurrent();
    if (!season) return null;

    const standing = await this.standings.findStanding(userId, season.id);
    return (
      standing ?? {
        userId,
        seasonId: season.id,
        tier: RacingLeagueTier.BRONZE,
        points: 0,
      }
    );
  }
}
