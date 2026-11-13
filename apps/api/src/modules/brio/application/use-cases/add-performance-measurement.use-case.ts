import { Inject, Injectable } from '@nestjs/common';
import {
  BRIO_PERFORMANCE_REPOSITORY,
  type BrioPerformanceRepositoryPort,
} from '../ports/brio-performance-repository.port';
import type { PerformanceMeasurement } from '../../domain/entities/performance.entity';
import type { AddMeasurementData } from '../ports/brio-performance-repository.port';

/** VO2max o umbral que el usuario trae de un test o de su dispositivo. */
@Injectable()
export class AddPerformanceMeasurementUseCase {
  constructor(
    @Inject(BRIO_PERFORMANCE_REPOSITORY)
    private readonly performance: BrioPerformanceRepositoryPort,
  ) {}

  execute(data: AddMeasurementData): Promise<PerformanceMeasurement> {
    return this.performance.addMeasurement(data);
  }
}
