import { Inject, Injectable } from '@nestjs/common';
import {
  RITMO_PERFORMANCE_REPOSITORY,
  type RitmoPerformanceRepositoryPort,
} from '../ports/ritmo-performance-repository.port';
import type { Exercise } from '../../domain/entities/performance.entity';

@Injectable()
export class ListExercisesUseCase {
  constructor(
    @Inject(RITMO_PERFORMANCE_REPOSITORY)
    private readonly performance: RitmoPerformanceRepositoryPort,
  ) {}

  execute(userId: string): Promise<Exercise[]> {
    return this.performance.listExercisesVisibleTo(userId);
  }
}
