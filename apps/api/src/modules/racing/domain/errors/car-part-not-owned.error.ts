import { DomainError } from '../../../../shared/errors/domain-error';

// Distinto de `CarPartNotFoundError`: la pieza existe y está activa, pero
// el jugador no la tiene desbloqueada (no es `isUnlockedByDefault` ni tiene
// fila en `PlayerCarPart`) — no puede equiparla todavía.
export class CarPartNotOwnedError extends DomainError {
  constructor(partId: string) {
    super(
      'RACING_CAR_PART_NOT_OWNED',
      `El jugador no tiene desbloqueada la pieza ${partId}.`,
      { partId },
    );
  }
}
