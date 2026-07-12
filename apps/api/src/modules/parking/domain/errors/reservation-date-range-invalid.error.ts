import { DomainError } from '../../../../shared/errors/domain-error';

export class ReservationDateRangeInvalidError extends DomainError {
  constructor() {
    super(
      'RESERVATION_DATE_RANGE_INVALID',
      'La fecha de fin debe ser posterior a la fecha de inicio.',
    );
  }
}
