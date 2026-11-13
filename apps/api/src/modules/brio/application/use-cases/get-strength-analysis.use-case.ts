import { Inject, Injectable } from '@nestjs/common';
import { dayInTimezone } from '../../domain/services/calendar';
import {
  analyzeStrength,
  type StrengthAnalysis,
} from '../../domain/services/performance/strength-engine';
import {
  periodDays,
  type PerformancePeriod,
} from '../../domain/services/performance/periods';
import { daysBetween } from '../../domain/services/performance/stats';
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

/** Máximo de sesiones por ejercicio que se devuelven (las más recientes). */
const MAX_HISTORY_POINTS = 120;

/**
 * Progresión de fuerza por ejercicio. Se calcula al vuelo sobre el historial
 * completo: las marcas y el estancamiento necesitan todo lo registrado.
 */
@Injectable()
export class GetStrengthAnalysisUseCase {
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
  ): Promise<StrengthAnalysis> {
    const [sessions, exercises, bodyWeightKg, profile] = await Promise.all([
      this.performance.trainingHistory(userId, null),
      this.performance.listExercisesVisibleTo(userId),
      this.body.latestWeightKg(userId),
      this.profiles.findByUserId(userId),
    ]);
    const today = dayInTimezone(
      new Date(),
      profile?.timezone ?? 'Europe/Madrid',
    );
    const days = periodDays(period);
    const analysis = analyzeStrength(sessions, exercises, {
      today,
      bodyWeightKg,
      periodDays: days,
    });
    // El motor trabaja con todo el historial (marcas, estancamiento), pero por
    // la red solo viajan los puntos del periodo: con años de datos, mandarlo
    // todo eran megas de respuesta.
    return {
      ...analysis,
      exercises: analysis.exercises.map((e) => ({
        ...e,
        history: e.history
          .filter((p) => days === null || daysBetween(p.day, today) < days)
          .slice(-MAX_HISTORY_POINTS),
      })),
    };
  }
}
