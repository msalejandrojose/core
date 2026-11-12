import { Inject, Injectable } from '@nestjs/common';
import { dayInTimezone } from '../../domain/services/calendar';
import {
  analyzeStrength,
  type StrengthAnalysis,
} from '../../domain/services/performance/strength-engine';
import {
  RITMO_BODY_REPOSITORY,
  type RitmoBodyRepositoryPort,
} from '../ports/ritmo-body-repository.port';
import {
  RITMO_PERFORMANCE_REPOSITORY,
  type RitmoPerformanceRepositoryPort,
} from '../ports/ritmo-performance-repository.port';
import {
  RITMO_PROFILE_REPOSITORY,
  type RitmoProfileRepositoryPort,
} from '../ports/ritmo-profile-repository.port';

/**
 * Progresión de fuerza por ejercicio. Se calcula al vuelo sobre el historial
 * completo: las marcas y el estancamiento necesitan todo lo registrado.
 */
@Injectable()
export class GetStrengthAnalysisUseCase {
  constructor(
    @Inject(RITMO_PERFORMANCE_REPOSITORY)
    private readonly performance: RitmoPerformanceRepositoryPort,
    @Inject(RITMO_BODY_REPOSITORY)
    private readonly body: RitmoBodyRepositoryPort,
    @Inject(RITMO_PROFILE_REPOSITORY)
    private readonly profiles: RitmoProfileRepositoryPort,
  ) {}

  async execute(userId: string): Promise<StrengthAnalysis> {
    const [sessions, exercises, bodyWeightKg, profile] = await Promise.all([
      this.performance.trainingHistory(userId, null),
      this.performance.listExercisesVisibleTo(userId),
      this.body.latestWeightKg(userId),
      this.profiles.findByUserId(userId),
    ]);
    return analyzeStrength(sessions, exercises, {
      today: dayInTimezone(new Date(), profile?.timezone ?? 'Europe/Madrid'),
      bodyWeightKg,
    });
  }
}
