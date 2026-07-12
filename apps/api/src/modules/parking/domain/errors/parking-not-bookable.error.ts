import { DomainError } from '../../../../shared/errors/domain-error';

/** La plaza no existe o no está en estado `PUBLISHED` (no reservable ahora mismo). */
export class ParkingNotBookableError extends DomainError {
  constructor(parkingId: string) {
    super(
      'PARKING_NOT_BOOKABLE',
      `La plaza ${parkingId} no existe o no está disponible para reservar.`,
      { parkingId },
    );
  }
}
