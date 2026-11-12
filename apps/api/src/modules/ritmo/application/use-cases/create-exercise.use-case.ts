import { Inject, Injectable } from '@nestjs/common';
import {
  RITMO_PERFORMANCE_REPOSITORY,
  type RitmoPerformanceRepositoryPort,
} from '../ports/ritmo-performance-repository.port';
import type { Exercise } from '../../domain/entities/performance.entity';
import type { CreateExerciseData } from '../ports/ritmo-performance-repository.port';

/** Ejercicio propio del usuario, con los músculos y pesos que él indique. */
@Injectable()
export class CreateExerciseUseCase {
  constructor(
    @Inject(RITMO_PERFORMANCE_REPOSITORY)
    private readonly performance: RitmoPerformanceRepositoryPort,
  ) {}

  execute(data: CreateExerciseData): Promise<Exercise> {
    return this.performance.createExercise(data);
  }
}
