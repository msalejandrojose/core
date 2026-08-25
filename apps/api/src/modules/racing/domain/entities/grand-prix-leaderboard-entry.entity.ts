// Fila de la clasificación agregada de un Grand Prix (TASK-247/248): un
// jugador por fila, con su mejor intento COMPLETED — mismo patrón que
// `LeaderboardEntry` por circuito.
export class GrandPrixLeaderboardEntry {
  constructor(
    readonly position: number,
    readonly userId: string,
    readonly displayName: string,
    readonly totalDurationMs: number,
    readonly completedAt: Date,
  ) {}
}
