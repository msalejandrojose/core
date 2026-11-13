import { DomainError } from '../../../../shared/errors/domain-error';

export class BrioExerciseNotFoundError extends DomainError {
  constructor(id: string) {
    super('BRIO_EXERCISE_NOT_FOUND', `Ejercicio ${id} no encontrado.`, {
      id,
    });
  }
}
