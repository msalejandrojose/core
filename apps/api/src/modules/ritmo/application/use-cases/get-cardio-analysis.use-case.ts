import { Inject, Injectable } from '@nestjs/common';
import { dayInTimezone } from '../../domain/services/calendar';
import {
  analyzeCardio,
  type CardioAnalysis,
} from '../../domain/services/performance/cardio-engine';
import {
  periodDays,
  type PerformancePeriod,
} from '../../domain/services/performance/periods';
import {
  RITMO_PERFORMANCE_REPOSITORY,
  type RitmoPerformanceRepositoryPort,
} from '../ports/ritmo-performance-repository.port';
import {
  RITMO_PROFILE_REPOSITORY,
  type RitmoProfileRepositoryPort,
} from '../ports/ritmo-profile-repository.port';

/**
 * Análisis cardiovascular. Lee todo el historial (predicciones y evolución
 * usan sus propias ventanas) y el periodo solo acota el resumen y las zonas.
 */
@Injectable()
export class GetCardioAnalysisUseCase {
  constructor(
    @Inject(RITMO_PERFORMANCE_REPOSITORY)
    private readonly performance: RitmoPerformanceRepositoryPort,
    @Inject(RITMO_PROFILE_REPOSITORY)
    private readonly profiles: RitmoProfileRepositoryPort,
  ) {}

  async execute(
    userId: string,
    period: PerformancePeriod,
  ): Promise<CardioAnalysis> {
    const [sessions, heartConfig, measurements, profile] = await Promise.all([
      this.performance.trainingHistory(userId, null),
      this.performance.getHeartConfig(userId),
      this.performance.listMeasurements(userId),
      this.profiles.findByUserId(userId),
    ]);
    return analyzeCardio(sessions, heartConfig, measurements, {
      today: dayInTimezone(new Date(), profile?.timezone ?? 'Europe/Madrid'),
      periodDays: periodDays(period),
    });
  }
}
