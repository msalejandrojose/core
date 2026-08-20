export const PLAYER_CAR_PART_REPOSITORY = Symbol(
  'RACING_PLAYER_CAR_PART_REPOSITORY',
);

export interface PlayerCarPartRepositoryPort {
  /** Ids de las piezas que el jugador tiene desbloqueadas explícitamente
   *  (más allá de las `isUnlockedByDefault`). */
  listOwnedPartIds(userId: string): Promise<string[]>;
  ownsPart(userId: string, partId: string): Promise<boolean>;
  /** Idempotente: si el jugador ya tenía la pieza, no hace nada. */
  grant(userId: string, partId: string): Promise<void>;
}
