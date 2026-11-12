import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  RITMO_PERFORMANCE_REPOSITORY,
  type RitmoPerformanceRepositoryPort,
} from '../ports/ritmo-performance-repository.port';

@Injectable()
export class DeletePerformanceMeasurementUseCase {
  constructor(
    @Inject(RITMO_PERFORMANCE_REPOSITORY)
    private readonly performance: RitmoPerformanceRepositoryPort,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const deleted = await this.performance.deleteMeasurement(id, userId);
    if (!deleted) throw new NotFoundException('RITMO_MEASUREMENT_NOT_FOUND');
  }
}
