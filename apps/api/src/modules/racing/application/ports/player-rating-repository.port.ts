import { PaginatedResult } from '../../../../shared/types/paginated-result';

export const PLAYER_RATING_REPOSITORY = Symbol('RACING_PLAYER_RATING_REPOSITORY');

export interface RatingUpdate {
  userId: string;
  rating: number;
}

export interface AdminListPlayerRatingsOptions {
  page: number;
  limit: number;
}

// Fila enriquecida para el backoffice (TASK-323, tarea 8): a diferencia del
// rating puro (`getRating`), trae ya el email/nombre del jugador — mismo
// criterio que `AdminLapTimeListEntry` para los intentos de vuelta. Solo
// incluye a quien YA tiene fila (ha jugado al menos una carrera en vivo con
// alguien más real) — nadie empieza en el ranking en 1000 sin haber corrido.
export interface AdminPlayerRatingListEntry {
  userId: string;
  userEmail: string;
  userDisplayName: string;
  rating: number;
}

export interface PlayerRatingRepositoryPort {
  /** 1000 (rating inicial) si el jugador todavía no tiene fila — nunca
   *  falla por ausencia, igual que `RacingWalletRepositoryPort.getBalance`. */
  getRating(userId: string): Promise<number>;
  /** Igual que `getRating`, pero en lote: el mapa devuelto trae SIEMPRE una
   *  entrada por cada id pedido, con 1000 de relleno para quien no tenga fila. */
  getRatings(userIds: string[]): Promise<Map<string, number>>;
  /** Aplica ya el rating final de cada jugador (ya calculado por
   *  `computeRatingChanges`) — no sabe de Elo, solo persiste el número. */
  applyChanges(changes: RatingUpdate[]): Promise<void>;
  /** Ranking para el backoffice, de mayor a menor rating (TASK-323, tarea 8). */
  listAllAdmin(
    opts: AdminListPlayerRatingsOptions,
  ): Promise<PaginatedResult<AdminPlayerRatingListEntry>>;
}
