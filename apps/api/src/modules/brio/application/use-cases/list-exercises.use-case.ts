import { Inject, Injectable } from '@nestjs/common';
import {
  BRIO_PERFORMANCE_REPOSITORY,
  type BrioPerformanceRepositoryPort,
} from '../ports/brio-performance-repository.port';
import type { Exercise } from '../../domain/entities/performance.entity';

@Injectable()
export class ListExercisesUseCase {
  constructor(
    @Inject(BRIO_PERFORMANCE_REPOSITORY)
    private readonly performance: BrioPerformanceRepositoryPort,
  ) {}

  execute(userId: string): Promise<Exercise[]> {
    return this.performance.listExercisesVisibleTo(userId);
  }
}
