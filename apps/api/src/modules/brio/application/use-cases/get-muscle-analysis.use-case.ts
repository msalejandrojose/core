import { Inject, Injectable } from '@nestjs/common';
import { dayInTimezone } from '../../domain/services/calendar';
import {
  analyzeMuscles,
  type MuscleAnalysisResult,
} from '../../domain/services/performance/muscle-engine';
import {
  periodDays,
  type PerformancePeriod,
} from '../../domain/services/performance/periods';
import {
  BRIO_BODY_REPOSITORY,
  type BrioBodyRepositoryPort,
} from '../ports/brio-body-repository.port';
import {
  BRIO_PERFORMANCE_REPOSITORY,
  type BrioPerformanceRepositoryPort,
} from '../ports/brio-performance-repository.port';
import {
  BRIO_PROFILE_REPOSITORY,
  type BrioProfileRepositoryPort,
} from '../ports/brio-profile-repository.port';

/**
 * Carga de entrenamiento por grupo muscular. Se calcula al vuelo sobre el historial
 * completo (el volumen histórico lo necesita).
 */
@Injectable()
export class GetMuscleAnalysisUseCase {
  constructor(
    @Inject(BRIO_PERFORMANCE_REPOSITORY)
    private readonly performance: BrioPerformanceRepositoryPort,
    @Inject(BRIO_BODY_REPOSITORY)
    private readonly body: BrioBodyRepositoryPort,
    @Inject(BRIO_PROFILE_REPOSITORY)
    private readonly profiles: BrioProfileRepositoryPort,
  ) {}

  async execute(
    userId: string,
    period: PerformancePeriod = 'all',
  ): Promise<MuscleAnalysisResult> {
    const [sessions, exercises, bodyWeightKg, profile] = await Promise.all([
      this.performance.trainingHistory(userId, null),
      this.performance.listExercisesVisibleTo(userId),
      this.body.latestWeightKg(userId),
      this.profiles.findByUserId(userId),
    ]);
    return analyzeMuscles(sessions, exercises, {
      today: dayInTimezone(new Date(), profile?.timezone ?? 'Europe/Madrid'),
      bodyWeightKg,
      periodDays: periodDays(period),
    });
  }
}
