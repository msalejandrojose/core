import { DomainError } from '../../../../shared/errors/domain-error';

// Distinto de `CarArchetypeNotFoundError`: el arquetipo existe y está
// activo, pero el jugador no lo tiene desbloqueado (no es
// `isUnlockedByDefault` ni tiene fila en `PlayerCarArchetype`) — no puede
// equiparlo todavía.
export class CarArchetypeNotOwnedError extends DomainError {
  constructor(archetypeId: string) {
    super(
      'RACING_CAR_ARCHETYPE_NOT_OWNED',
      `El jugador no tiene desbloqueado el arquetipo ${archetypeId}.`,
      { archetypeId },
    );
  }
}
