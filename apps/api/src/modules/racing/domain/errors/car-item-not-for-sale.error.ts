import { DomainError } from '../../../../shared/errors/domain-error';

// `priceCoins` es null: existe y puede estar bloqueado, pero no se puede
// comprar con monedas (p.ej. un desbloqueable solo por racha, TASK-321).
export class CarItemNotForSaleError extends DomainError {
  constructor(itemId: string) {
    super(
      'RACING_CAR_ITEM_NOT_FOR_SALE',
      `${itemId} no está a la venta.`,
      { itemId },
    );
  }
}
