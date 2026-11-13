import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  BRIO_PERFORMANCE_REPOSITORY,
  type BrioPerformanceRepositoryPort,
} from '../ports/brio-performance-repository.port';

@Injectable()
export class DeletePerformanceMeasurementUseCase {
  constructor(
    @Inject(BRIO_PERFORMANCE_REPOSITORY)
    private readonly performance: BrioPerformanceRepositoryPort,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const deleted = await this.performance.deleteMeasurement(id, userId);
    if (!deleted) throw new NotFoundException('BRIO_MEASUREMENT_NOT_FOUND');
  }
}
