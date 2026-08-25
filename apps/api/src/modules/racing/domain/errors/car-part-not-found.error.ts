import { DomainError } from '../../../../shared/errors/domain-error';

export class CarPartNotFoundError extends DomainError {
  constructor(id: string) {
    super('RACING_CAR_PART_NOT_FOUND', `Pieza de coche ${id} no encontrada.`, {
      id,
    });
  }
}
