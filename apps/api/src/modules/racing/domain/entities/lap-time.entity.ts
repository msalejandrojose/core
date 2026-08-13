// Un intento de vuelta subido por un jugador.
export class LapTime {
  constructor(
    readonly id: string,
    readonly userId: string,
    readonly trackId: string,
    readonly durationMs: number,
    readonly splitsMs: number[],
    readonly clientVersion: string,
    readonly createdAt: Date,
  ) {}
}

// Una fila del leaderboard: el mejor tiempo de un jugador en un circuito.
export class LeaderboardEntry {
  constructor(
    readonly position: number,
    readonly userId: string,
    readonly displayName: string,
    readonly durationMs: number,
    readonly achievedAt: Date,
  ) {}
}
