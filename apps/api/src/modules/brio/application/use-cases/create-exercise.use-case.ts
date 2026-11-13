import { Inject, Injectable } from '@nestjs/common';
import {
  BRIO_PERFORMANCE_REPOSITORY,
  type BrioPerformanceRepositoryPort,
} from '../ports/brio-performance-repository.port';
import type { Exercise } from '../../domain/entities/performance.entity';
import type { CreateExerciseData } from '../ports/brio-performance-repository.port';

/** Ejercicio propio del usuario, con los músculos y pesos que él indique. */
@Injectable()
export class CreateExerciseUseCase {
  constructor(
    @Inject(BRIO_PERFORMANCE_REPOSITORY)
    private readonly performance: BrioPerformanceRepositoryPort,
  ) {}

  execute(data: CreateExerciseData): Promise<Exercise> {
    return this.performance.createExercise(data);
  }
}
