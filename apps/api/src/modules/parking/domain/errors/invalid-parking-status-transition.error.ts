import type { ParkingStatus } from '@core/shared-types';
import { DomainError } from '../../../../shared/errors/domain-error';

export class InvalidParkingStatusTransitionError extends DomainError {
  constructor(from: ParkingStatus, to: ParkingStatus) {
    super(
      'INVALID_PARKING_TRANSITION',
      `La transición de estado de la plaza de ${from} a ${to} no está permitida.`,
      { from, to },
    );
  }
}
