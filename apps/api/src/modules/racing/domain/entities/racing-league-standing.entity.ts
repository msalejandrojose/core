// Las 5 ligas de temporada (TASK-291). El orden importa: se usa para
// comparar umbrales en `tierForPoints`.
export enum RacingLeagueTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
  DIAMOND = 'DIAMOND',
}

// Puntos y liga de un jugador en una temporada concreta. Sin fila = Bronce/0
// (se crea perezosamente en la primera carrera puntuable, mismo criterio
// que `RacingWallet`) — el "reinicio por temporada" sale gratis así.
export interface RacingLeagueStanding {
  userId: string;
  seasonId: string;
  tier: RacingLeagueTier;
  points: number;
}
