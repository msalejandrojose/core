import { DomainError } from '../../../../shared/errors/domain-error';

export class NutreFoodNotFoundError extends DomainError {
  constructor(id: string) {
    super('NUTRE_FOOD_NOT_FOUND', `Alimento ${id} no encontrado.`, { id });
  }
}
