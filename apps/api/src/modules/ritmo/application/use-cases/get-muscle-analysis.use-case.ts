import { Inject, Injectable } from '@nestjs/common';
import { dayInTimezone } from '../../domain/services/calendar';
import {
  analyzeMuscles,
  type MuscleAnalysisResult,
} from '../../domain/services/performance/muscle-engine';
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
 * Carga de entrenamiento por grupo muscular. Se calcula al vuelo sobre el historial
 * completo (el volumen histórico lo necesita).
 */
@Injectable()
export class GetMuscleAnalysisUseCase {
  constructor(
    @Inject(RITMO_PERFORMANCE_REPOSITORY)
    private readonly performance: RitmoPerformanceRepositoryPort,
    @Inject(RITMO_BODY_REPOSITORY)
    private readonly body: RitmoBodyRepositoryPort,
    @Inject(RITMO_PROFILE_REPOSITORY)
    private readonly profiles: RitmoProfileRepositoryPort,
  ) {}

  async execute(userId: string): Promise<MuscleAnalysisResult> {
    const [sessions, exercises, bodyWeightKg, profile] = await Promise.all([
      this.performance.trainingHistory(userId, null),
      this.performance.listExercisesVisibleTo(userId),
      this.body.latestWeightKg(userId),
      this.profiles.findByUserId(userId),
    ]);
    return analyzeMuscles(sessions, exercises, {
      today: dayInTimezone(new Date(), profile?.timezone ?? 'Europe/Madrid'),
      bodyWeightKg,
    });
  }
}
