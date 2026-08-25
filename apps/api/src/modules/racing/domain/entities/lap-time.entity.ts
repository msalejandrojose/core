import { GhostSnapshot } from './ghost-snapshot';

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
    // Anulado desde el backoffice sin borrar la fila. Nulo = válido.
    readonly invalidatedAt: Date | null = null,
    // Solo presente si esta fila es (o fue) la mejor marca del jugador en el
    // circuito (TASK-221): el resto de intentos no lo necesitan, y
    // guardarlo en todos multiplicaría el almacenamiento sin uso claro.
    readonly ghostSnapshots: GhostSnapshot[] | null = null,
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
