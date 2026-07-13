import { DomainError } from '../../../../shared/errors/domain-error';

export class ParkingPriceOverrideNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      'PARKING_PRICE_OVERRIDE_NOT_FOUND',
      `Precio especial ${id} no encontrado en la plaza.`,
      { id },
    );
  }
}
