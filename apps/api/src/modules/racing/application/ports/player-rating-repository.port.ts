export const PLAYER_RATING_REPOSITORY = Symbol('RACING_PLAYER_RATING_REPOSITORY');

export interface RatingUpdate {
  userId: string;
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
}
