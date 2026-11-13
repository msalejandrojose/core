import { DomainError } from '../../../../shared/errors/domain-error';

export class BrioFoodNotFoundError extends DomainError {
  constructor(id: string) {
    super('BRIO_FOOD_NOT_FOUND', `Alimento ${id} no encontrado.`, { id });
  }
}
