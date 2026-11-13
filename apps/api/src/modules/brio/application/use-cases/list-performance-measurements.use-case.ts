import { Inject, Injectable } from '@nestjs/common';
import {
  BRIO_PERFORMANCE_REPOSITORY,
  type BrioPerformanceRepositoryPort,
} from '../ports/brio-performance-repository.port';
import type { PerformanceMeasurement } from '../../domain/entities/performance.entity';

@Injectable()
export class ListPerformanceMeasurementsUseCase {
  constructor(
    @Inject(BRIO_PERFORMANCE_REPOSITORY)
    private readonly performance: BrioPerformanceRepositoryPort,
  ) {}

  execute(userId: string): Promise<PerformanceMeasurement[]> {
    return this.performance.listMeasurements(userId);
  }
}
