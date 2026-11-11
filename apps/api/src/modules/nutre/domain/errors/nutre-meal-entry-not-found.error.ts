import { DomainError } from '../../../../shared/errors/domain-error';

export class NutreMealEntryNotFoundError extends DomainError {
  constructor(id: string) {
    super('NUTRE_MEAL_ENTRY_NOT_FOUND', `Entrada de comida ${id} no encontrada.`, {
      id,
    });
  }
}
