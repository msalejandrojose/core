import { Inject, Injectable } from '@nestjs/common';
import type {
  ActivitySession,
  Effort,
} from '../../domain/entities/activity-session.entity';
import { RitmoActivityTypeNotFoundError } from '../../domain/errors/ritmo-activity-type-not-found.error';
import { RitmoWeightUnknownError } from '../../domain/errors/ritmo-weight-unknown.error';
import { dayInTimezone } from '../../domain/services/calendar';
import { sessionKcal } from '../../domain/services/energy';
import {
  RITMO_ACTIVITY_REPOSITORY,
  type RitmoActivityRepositoryPort,
} from '../ports/ritmo-activity-repository.port';
import {
  RITMO_BODY_REPOSITORY,
  type RitmoBodyRepositoryPort,
} from '../ports/ritmo-body-repository.port';
import {
  RITMO_PROFILE_REPOSITORY,
  type RitmoProfileRepositoryPort,
} from '../ports/ritmo-profile-repository.port';
import { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';

export interface LogActivitySessionInput {
  userId: string;
  activityTypeId: string;
  startedAt: Date;
  durationSec: number;
  distanceM: number | null;
  avgHeartRate: number | null;
  effort: Effort | null;
  notes: string | null;
}

/**
 * Registrar un entreno. El gasto no lo manda el cliente: lo estima el dominio
 * con el MET del tipo de actividad y el peso actual del usuario, y se persiste
 * como snapshot (`kcalBurned`).
 */
@Injectable()
export class LogActivitySessionUseCase {
  constructor(
    @Inject(RITMO_ACTIVITY_REPOSITORY)
    private readonly activity: RitmoActivityRepositoryPort,
    @Inject(RITMO_BODY_REPOSITORY)
    private readonly body: RitmoBodyRepositoryPort,
    @Inject(RITMO_PROFILE_REPOSITORY)
    private readonly profiles: RitmoProfileRepositoryPort,
    private readonly refreshDailyLog: RefreshDailyLogUseCase,
  ) {}

  async execute(input: LogActivitySessionInput): Promise<ActivitySession> {
    const type = await this.activity.findTypeVisibleTo(
      input.activityTypeId,
      input.userId,
    );
    if (!type) throw new RitmoActivityTypeNotFoundError(input.activityTypeId);

    const weightKg = await this.body.latestWeightKg(input.userId);
    if (weightKg === null) throw new RitmoWeightUnknownError(input.userId);

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
