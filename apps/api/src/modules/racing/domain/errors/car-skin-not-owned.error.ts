import { DomainError } from '../../../../shared/errors/domain-error';

// Distinto de `CarSkinNotFoundError`: el skin existe y está activo, pero el
// jugador no lo tiene desbloqueado (no es `isUnlockedByDefault` ni tiene fila
// en `PlayerCarSkin`) — no puede equiparlo todavía.
export class CarSkinNotOwnedError extends DomainError {
  constructor(skinId: string) {
    super(
      'RACING_CAR_SKIN_NOT_OWNED',
      `El jugador no tiene desbloqueado el skin ${skinId}.`,
      { skinId },
    );
  }
}
