import { DomainError } from '../../../../shared/errors/domain-error';

export class RitmoExerciseNotFoundError extends DomainError {
  constructor(id: string) {
    super('RITMO_EXERCISE_NOT_FOUND', `Ejercicio ${id} no encontrado.`, {
      id,
    });
  }
}
