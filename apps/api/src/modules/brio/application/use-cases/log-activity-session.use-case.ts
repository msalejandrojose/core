import { Inject, Injectable } from '@nestjs/common';
import type {
  ActivitySession,
  Effort,
} from '../../domain/entities/activity-session.entity';
import type { StrengthSet } from '../../domain/entities/performance.entity';
import { BrioExerciseNotFoundError } from '../../domain/errors/brio-exercise-not-found.error';
import { BrioActivityTypeNotFoundError } from '../../domain/errors/brio-activity-type-not-found.error';
import { BrioWeightUnknownError } from '../../domain/errors/brio-weight-unknown.error';
import { dayInTimezone } from '../../domain/services/calendar';
import { sessionKcal } from '../../domain/services/energy';
import {
  BRIO_ACTIVITY_REPOSITORY,
  type BrioActivityRepositoryPort,
} from '../ports/brio-activity-repository.port';
import {
  BRIO_BODY_REPOSITORY,
  type BrioBodyRepositoryPort,
} from '../ports/brio-body-repository.port';
import {
  BRIO_PROFILE_REPOSITORY,
  type BrioProfileRepositoryPort,
} from '../ports/brio-profile-repository.port';
import {
  BRIO_PERFORMANCE_REPOSITORY,
  type BrioPerformanceRepositoryPort,
} from '../ports/brio-performance-repository.port';
import { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';

export interface LogActivitySessionInput {
  userId: string;
  activityTypeId: string;
  startedAt: Date;
  durationSec: number;
  distanceM: number | null;
  avgHeartRate: number | null;
  maxHeartRate?: number | null;
  elevationGainM?: number | null;
  cadence?: number | null;
  rpe?: number | null;
  zoneSeconds?: number[] | null;
  effort: Effort | null;
  notes: string | null;
  sets?: StrengthSet[];
}

/**
 * Registrar un entreno. El gasto no lo manda el cliente: lo estima el dominio
 * con el MET del tipo de actividad y el peso actual del usuario, y se persiste
 * como snapshot (`kcalBurned`).
 */
@Injectable()
export class LogActivitySessionUseCase {
  constructor(
    @Inject(BRIO_ACTIVITY_REPOSITORY)
    private readonly activity: BrioActivityRepositoryPort,
    @Inject(BRIO_BODY_REPOSITORY)
    private readonly body: BrioBodyRepositoryPort,
    @Inject(BRIO_PROFILE_REPOSITORY)
    private readonly profiles: BrioProfileRepositoryPort,
    @Inject(BRIO_PERFORMANCE_REPOSITORY)
    private readonly performance: BrioPerformanceRepositoryPort,
    private readonly refreshDailyLog: RefreshDailyLogUseCase,
  ) {}

  async execute(input: LogActivitySessionInput): Promise<ActivitySession> {
    const type = await this.activity.findTypeVisibleTo(
      input.activityTypeId,
      input.userId,
    );
    if (!type) throw new BrioActivityTypeNotFoundError(input.activityTypeId);

    const sets = input.sets ?? [];
    const missing = await this.performance.missingExercises(
      [...new Set(sets.map((s) => s.exerciseId))],
      input.userId,
    );
    if (missing.length) throw new BrioExerciseNotFoundError(missing[0]);

    const weightKg = await this.body.latestWeightKg(input.userId);
    if (weightKg === null) throw new BrioWeightUnknownError(input.userId);

    const profile = await this.profiles.findByUserId(input.userId);
    const loggedOn = dayInTimezone(
      input.startedAt,
      profile?.timezone ?? 'Europe/Madrid',
    );

    const session = await this.activity.createSession({
      userId: input.userId,
      activityTypeId: type.id,
      startedAt: input.startedAt,
      loggedOn,
      durationSec: input.durationSec,
      distanceM: input.distanceM,
      avgHeartRate: input.avgHeartRate,
      maxHeartRate: input.maxHeartRate ?? null,
      elevationGainM: input.elevationGainM ?? null,
      cadence: input.cadence ?? null,
      rpe: input.rpe ?? null,
      zoneSeconds: input.zoneSeconds ?? null,
      sets,
      effort: input.effort,
      kcalBurned: sessionKcal({
        met: type.met,
        weightKg,
        durationSec: input.durationSec,
        effort: input.effort,
      }),
      notes: input.notes,
    });

    await this.refreshDailyLog.execute(input.userId, loggedOn);
    return session;
  }
}
