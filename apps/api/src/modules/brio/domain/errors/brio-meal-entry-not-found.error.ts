import { DomainError } from '../../../../shared/errors/domain-error';

export class BrioMealEntryNotFoundError extends DomainError {
  constructor(id: string) {
    super(
      'BRIO_MEAL_ENTRY_NOT_FOUND',
      `Entrada de comida ${id} no encontrada.`,
      {
        id,
      },
    );
  }
}
