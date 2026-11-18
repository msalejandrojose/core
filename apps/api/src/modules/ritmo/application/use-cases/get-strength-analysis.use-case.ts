import { Inject, Injectable } from '@nestjs/common';
import { RitmoExerciseNotFoundError } from '../../domain/errors/ritmo-exercise-not-found.error';
import { dayInTimezone } from '../../domain/services/calendar';
import {
  analyzeStrength,
  type ExerciseAnalysis,
  type StrengthAnalysis,
} from '../../domain/services/performance/strength-engine';
import {
  periodDays,
  type PerformancePeriod,
} from '../../domain/services/performance/periods';
import { daysBetween } from '../../domain/services/performance/stats';
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

/** Máximo de sesiones por ejercicio que se devuelven (las más recientes). */
const MAX_HISTORY_POINTS = 120;
/** En la ficha de un solo ejercicio caben más: un año entrenándolo a diario. */
const MAX_EXERCISE_HISTORY_POINTS = 400;

export interface ExerciseHistory {
  exerciseId: string;
  /** null si todavía no hay ninguna serie de este ejercicio. */
  analysis: ExerciseAnalysis | null;
}

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

  /** La progresión de un solo ejercicio, para su ficha. */
  async forExercise(
    userId: string,
    exerciseId: string,
    period: PerformancePeriod = '6m',
  ): Promise<ExerciseHistory> {
    const missing = await this.performance.missingExercises(
      [exerciseId],
      userId,
    );
    if (missing.length) throw new RitmoExerciseNotFoundError(exerciseId);
    const all = await this.execute(userId, period, MAX_EXERCISE_HISTORY_POINTS);
    return {
      exerciseId,
      analysis: all.exercises.find((e) => e.exerciseId === exerciseId) ?? null,
    };
  }

  async execute(
    userId: string,
    period: PerformancePeriod = 'all',
    maxPoints = MAX_HISTORY_POINTS,
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
          .slice(-maxPoints),
      })),
    };
  }
}
