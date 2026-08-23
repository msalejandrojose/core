import {
  RacingLeagueStanding,
  RacingLeagueTier,
} from '../../domain/entities/racing-league-standing.entity';

export const RACING_LEAGUE_REPOSITORY = Symbol('RACING_LEAGUE_REPOSITORY');

export interface RacingLeagueRepositoryPort {
  /** Bronce/0 si el jugador todavía no tiene fila esta temporada — nunca
   *  falla por ausencia, igual que `RacingWalletRepositoryPort.getBalance`. */
  findStanding(
    userId: string,
    seasonId: string,
  ): Promise<RacingLeagueStanding | null>;
  /** Crea la fila si no existía, o la sobrescribe con el total ya calculado
   *  (puntos + liga resultante) — el cálculo de "cuánto suma esta carrera"
   *  y "a qué liga corresponde ese total" vive en `AwardLeaguePointsUseCase`/
   *  `racing-league-tier.ts`, no aquí: esto solo persiste el resultado. */
  upsertStanding(
    userId: string,
    seasonId: string,
    data: { points: number; tier: RacingLeagueTier },
  ): Promise<RacingLeagueStanding>;
}
