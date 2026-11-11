import { DomainError } from '../../../../shared/errors/domain-error';

export class RitmoMealEntryNotFoundError extends DomainError {
  constructor(id: string) {
    super('RITMO_MEAL_ENTRY_NOT_FOUND', `Entrada de comida ${id} no encontrada.`, {
      id,
    });
  }
}
