import { DomainError } from '../../../../shared/errors/domain-error';

export class ParkingNotFoundError extends DomainError {
  constructor(id: string) {
    super('PARKING_NOT_FOUND', `Plaza ${id} no encontrada.`, { id });
  }
}
