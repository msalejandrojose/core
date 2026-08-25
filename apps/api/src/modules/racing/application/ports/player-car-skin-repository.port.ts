export const PLAYER_CAR_SKIN_REPOSITORY = Symbol(
  'RACING_PLAYER_CAR_SKIN_REPOSITORY',
);

export interface PlayerCarSkinRepositoryPort {
  /** Ids de los skins que el jugador tiene desbloqueados explícitamente
   *  (más allá de los `isUnlockedByDefault`). */
  listOwnedSkinIds(userId: string): Promise<string[]>;
  ownsSkin(userId: string, skinId: string): Promise<boolean>;
  /** Idempotente: si el jugador ya tenía el skin, no hace nada. */
  grant(userId: string, skinId: string): Promise<void>;
}
