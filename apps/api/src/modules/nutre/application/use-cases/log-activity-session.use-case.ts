import { Inject, Injectable } from '@nestjs/common';
import type {
  ActivitySession,
  Effort,
} from '../../domain/entities/activity-session.entity';
import { NutreActivityTypeNotFoundError } from '../../domain/errors/nutre-activity-type-not-found.error';
import { NutreWeightUnknownError } from '../../domain/errors/nutre-weight-unknown.error';
import { dayInTimezone } from '../../domain/services/calendar';
import { sessionKcal } from '../../domain/services/energy';
import {
  NUTRE_ACTIVITY_REPOSITORY,
  type NutreActivityRepositoryPort,
} from '../ports/nutre-activity-repository.port';
import {
  NUTRE_BODY_REPOSITORY,
  type NutreBodyRepositoryPort,
} from '../ports/nutre-body-repository.port';
import {
  NUTRE_PROFILE_REPOSITORY,
  type NutreProfileRepositoryPort,
} from '../ports/nutre-profile-repository.port';
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
    @Inject(NUTRE_ACTIVITY_REPOSITORY)
    private readonly activity: NutreActivityRepositoryPort,
    @Inject(NUTRE_BODY_REPOSITORY)
    private readonly body: NutreBodyRepositoryPort,
    @Inject(NUTRE_PROFILE_REPOSITORY)
    private readonly profiles: NutreProfileRepositoryPort,
    private readonly refreshDailyLog: RefreshDailyLogUseCase,
  ) {}

  async execute(input: LogActivitySessionInput): Promise<ActivitySession> {
    const type = await this.activity.findTypeVisibleTo(
      input.activityTypeId,
      input.userId,
    );
    if (!type) throw new NutreActivityTypeNotFoundError(input.activityTypeId);

    const weightKg = await this.body.latestWeightKg(input.userId);
    if (weightKg === null) throw new NutreWeightUnknownError(input.userId);

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
