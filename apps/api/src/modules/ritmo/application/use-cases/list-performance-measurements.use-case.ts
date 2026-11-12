import { Inject, Injectable } from '@nestjs/common';
import {
  RITMO_PERFORMANCE_REPOSITORY,
  type RitmoPerformanceRepositoryPort,
} from '../ports/ritmo-performance-repository.port';
import type { PerformanceMeasurement } from '../../domain/entities/performance.entity';

@Injectable()
export class ListPerformanceMeasurementsUseCase {
  constructor(
    @Inject(RITMO_PERFORMANCE_REPOSITORY)
    private readonly performance: RitmoPerformanceRepositoryPort,
  ) {}

  execute(userId: string): Promise<PerformanceMeasurement[]> {
    return this.performance.listMeasurements(userId);
  }
}
