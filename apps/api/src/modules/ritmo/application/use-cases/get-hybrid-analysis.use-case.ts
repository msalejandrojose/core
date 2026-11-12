import { Injectable } from '@nestjs/common';
import { CARDIO_KINDS } from '../../domain/entities/performance.entity';
import { detectCardioPlateau } from '../../domain/services/performance/cardio-engine';
import {
  analyzeHybrid,
  type HybridAnalysis,
} from '../../domain/services/performance/hybrid-engine';
import { analyzeStrength } from '../../domain/services/performance/strength-engine';
import {
  periodDays,
  type PerformancePeriod,
} from '../../domain/services/performance/periods';
import { PerformanceDataLoader } from './performance-data.loader';

/** Cómo conviven fuerza y cardio: equilibrio, tren inferior, interferencia y evolución. */
@Injectable()
export class GetHybridAnalysisUseCase {
  constructor(private readonly loader: PerformanceDataLoader) {}

  async execute(
    userId: string,
    period?: PerformancePeriod,
  ): Promise<HybridAnalysis> {
    const d = await this.loader.load(userId);
    const strength = analyzeStrength(d.sessions, d.exercises, {
      today: d.today,
      bodyWeightKg: d.bodyWeightKg,
    });
    const plateaus = CARDIO_KINDS.filter((k) =>
      d.sessions.some((s) => s.kind === k),
    ).map((k) => detectCardioPlateau(d.sessions, k, d.today));
    return analyzeHybrid(
      d.sessions,
      d.exercises,
      strength,
      plateaus,
      d.today,
      // Sin periodo, las 4 semanas de siempre.
      period ? periodDays(period) : undefined,
    );
  }
}
