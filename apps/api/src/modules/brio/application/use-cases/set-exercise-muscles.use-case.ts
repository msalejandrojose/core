import { Inject, Injectable } from '@nestjs/common';
import type {
  Exercise,
  MuscleWeight,
} from '../../domain/entities/performance.entity';
import { BrioExerciseNotFoundError } from '../../domain/errors/brio-exercise-not-found.error';
import {
  BRIO_PERFORMANCE_REPOSITORY,
  type BrioPerformanceRepositoryPort,
} from '../ports/brio-performance-repository.port';

/**
 * Ajustar cuánto trabaja un ejercicio cada músculo. Con `muscles` null se
 * vuelve a los pesos del catálogo. El cambio afecta a todos los análisis del
 * usuario desde la siguiente consulta, también hacia atrás: los motores
 * reparten las series con los pesos vigentes.
 */
@Injectable()
export class SetExerciseMusclesUseCase {
  constructor(
    @Inject(BRIO_PERFORMANCE_REPOSITORY)
    private readonly performance: BrioPerformanceRepositoryPort,
  ) {}

  async execute(
    exerciseId: string,
    userId: string,
    muscles: MuscleWeight[] | null,
  ): Promise<Exercise> {
    const exercise = muscles
      ? await this.performance.setExerciseMuscles(exerciseId, userId, muscles)
      : await this.performance.resetExerciseMuscles(exerciseId, userId);
    if (!exercise) throw new BrioExerciseNotFoundError(exerciseId);
    return exercise;
  }
}
