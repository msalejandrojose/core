import { Injectable } from '@nestjs/common';
import {
  runEngines,
  summarize,
  type PerformanceSummary,
} from '../../domain/services/performance/performance-engine';
import type { PerformancePeriod } from '../../domain/services/performance/periods';
import { PerformanceDataLoader } from './performance-data.loader';

/** Resumen de rendimiento del periodo: los cinco motores consolidados. */
@Injectable()
export class GetPerformanceSummaryUseCase {
  constructor(private readonly loader: PerformanceDataLoader) {}

  async execute(
    userId: string,
    period: PerformancePeriod,
  ): Promise<PerformanceSummary> {
    const data = await this.loader.load(userId);
    return summarize(data, runEngines(data, period), period);
  }
}
