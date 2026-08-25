export const PLAYER_CAR_ARCHETYPE_REPOSITORY = Symbol(
  'RACING_PLAYER_CAR_ARCHETYPE_REPOSITORY',
);

export interface PlayerCarArchetypeRepositoryPort {
  /** Ids de los arquetipos que el jugador tiene desbloqueados explícitamente
   *  (más allá de los `isUnlockedByDefault`). */
  listOwnedArchetypeIds(userId: string): Promise<string[]>;
  ownsArchetype(userId: string, archetypeId: string): Promise<boolean>;
  /** Idempotente: si el jugador ya tenía el arquetipo, no hace nada. */
  grant(userId: string, archetypeId: string): Promise<void>;
}
