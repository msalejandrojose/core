import { DomainError } from '../../../../shared/errors/domain-error';

export class RitmoFoodNotFoundError extends DomainError {
  constructor(id: string) {
    super('RITMO_FOOD_NOT_FOUND', `Alimento ${id} no encontrado.`, { id });
  }
}
