import { DomainError } from '../../../../shared/errors/domain-error';

export class ParkingPriceOverrideRangeInvalidError extends DomainError {
  constructor() {
    super(
      'PARKING_PRICE_OVERRIDE_RANGE_INVALID',
      'La fecha de fin debe ser posterior a la fecha de inicio.',
    );
  }
}
