import { Injectable } from '@nestjs/common';
import {
  analyzeFatigue,
  type FatigueAnalysis,
} from '../../domain/services/performance/fatigue-engine';
import { analyzeMuscles } from '../../domain/services/performance/muscle-engine';
import {
  periodDays,
  type PerformancePeriod,
} from '../../domain/services/performance/periods';
import { PerformanceDataLoader } from './performance-data.loader';

/** Carga acumulada de entrenamiento: fuerza y cardio juntas. */
@Injectable()
export class GetFatigueAnalysisUseCase {
  constructor(private readonly loader: PerformanceDataLoader) {}

  async execute(
    userId: string,
    period: PerformancePeriod = '30d',
  ): Promise<FatigueAnalysis> {
    const d = await this.loader.load(userId);
    const muscles = analyzeMuscles(d.sessions, d.exercises, {
      today: d.today,
      bodyWeightKg: d.bodyWeightKg,
    });
    return analyzeFatigue(d.sessions, d.heartConfig, muscles, {
      today: d.today,
      now: d.now,
      sex: d.sex,
      periodDays: periodDays(period),
    });
  }
}
