import { Inject, Injectable } from '@nestjs/common';
import {
  RITMO_PERFORMANCE_REPOSITORY,
  type RitmoPerformanceRepositoryPort,
} from '../ports/ritmo-performance-repository.port';
import type { PerformanceMeasurement } from '../../domain/entities/performance.entity';
import type { AddMeasurementData } from '../ports/ritmo-performance-repository.port';

/** VO2max o umbral que el usuario trae de un test o de su dispositivo. */
@Injectable()
export class AddPerformanceMeasurementUseCase {
  constructor(
    @Inject(RITMO_PERFORMANCE_REPOSITORY)
    private readonly performance: RitmoPerformanceRepositoryPort,
  ) {}

  execute(data: AddMeasurementData): Promise<PerformanceMeasurement> {
    return this.performance.addMeasurement(data);
  }
}
