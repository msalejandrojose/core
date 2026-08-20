import { DomainError } from '../../../../shared/errors/domain-error';

// El jugador ya tiene esto (gratis por `isUnlockedByDefault` o comprado
// antes) — no hay nada que comprar. Distinto de un fallo: es un estado
// perfectamente normal si el cliente pide comprar dos veces seguidas.
export class CarItemAlreadyOwnedError extends DomainError {
  constructor(itemId: string) {
    super(
      'RACING_CAR_ITEM_ALREADY_OWNED',
      `El jugador ya tiene ${itemId} — no hay nada que comprar.`,
      { itemId },
    );
  }
}
