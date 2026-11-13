import { Inject, Injectable } from '@nestjs/common';
import type {
  Exercise,
  HeartConfig,
  PerformanceMeasurement,
  TrainingSession,
} from '../../domain/entities/performance.entity';
import { dayInTimezone } from '../../domain/services/calendar';
import type { Sex } from '../../domain/services/performance/fatigue-engine';
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

/** Todo lo que los motores de rendimiento necesitan de un usuario. */
export interface PerformanceData {
  sessions: TrainingSession[];
  exercises: Exercise[];
  heartConfig: HeartConfig | null;
  measurements: PerformanceMeasurement[];
  bodyWeightKg: number | null;
  sex: Sex;
  /** Hoy en la zona horaria del usuario. */
  today: string;
  now: Date;
}

/**
 * Carga única de los datos de entrada de los motores. Los motores son puros;
 * este es el único punto donde se leen sus datos, así que todos trabajan
 * siempre sobre la misma foto del historial.
 */
@Injectable()
export class PerformanceDataLoader {
  constructor(
    @Inject(BRIO_PERFORMANCE_REPOSITORY)
    private readonly performance: BrioPerformanceRepositoryPort,
    @Inject(BRIO_BODY_REPOSITORY)
    private readonly body: BrioBodyRepositoryPort,
    @Inject(BRIO_PROFILE_REPOSITORY)
    private readonly profiles: BrioProfileRepositoryPort,
  ) {}

  async load(userId: string): Promise<PerformanceData> {
    const [
      sessions,
      exercises,
      heartConfig,
      measurements,
      bodyWeightKg,
      profile,
    ] = await Promise.all([
      this.performance.trainingHistory(userId, null),
      this.performance.listExercisesVisibleTo(userId),
      this.performance.getHeartConfig(userId),
      this.performance.listMeasurements(userId),
      this.body.latestWeightKg(userId),
      this.profiles.findByUserId(userId),
    ]);
    const now = new Date();
    return {
      sessions,
      exercises,
      heartConfig,
      measurements,
      bodyWeightKg,
      sex: profile?.sex ?? null,
      today: dayInTimezone(now, profile?.timezone ?? 'Europe/Madrid'),
      now,
    };
  }
}
