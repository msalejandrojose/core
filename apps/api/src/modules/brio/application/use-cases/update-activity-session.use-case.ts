import { Inject, Injectable } from '@nestjs/common';
import type {
  ActivitySession,
  Effort,
} from '../../domain/entities/activity-session.entity';
import { BrioActivitySessionNotFoundError } from '../../domain/errors/brio-activity-session-not-found.error';
import { dayInTimezone } from '../../domain/services/calendar';
import { sessionKcal } from '../../domain/services/energy';
import {
  BRIO_ACTIVITY_REPOSITORY,
  type BrioActivityRepositoryPort,
  type UpdateSessionData,
} from '../ports/brio-activity-repository.port';
import {
  BRIO_BODY_REPOSITORY,
  type BrioBodyRepositoryPort,
} from '../ports/brio-body-repository.port';
import {
  BRIO_PROFILE_REPOSITORY,
  type BrioProfileRepositoryPort,
} from '../ports/brio-profile-repository.port';
import { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';

/** `undefined` = no tocar; `null` = vaciar el campo. */
export interface UpdateActivitySessionInput {
  startedAt?: Date;
  durationSec?: number;
  distanceM?: number | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  elevationGainM?: number | null;
  cadence?: number | null;
  rpe?: number | null;
  zoneSeconds?: number[] | null;
  effort?: Effort | null;
  notes?: string | null;
}

/**
 * Editar un entreno ya registrado (todo menos el tipo y las series, que
 * tienen su propio endpoint).
 *
 * Las kcal son un snapshot, pero dependen de la duración y del esfuerzo: si
 * cambia alguno de los dos se vuelven a estimar con el peso actual. Si no
 * cambian, se dejan como estaban. Si cambia el día, se refrescan los
 * agregados del día viejo y del nuevo.
 */
@Injectable()
export class UpdateActivitySessionUseCase {
  constructor(
    @Inject(BRIO_ACTIVITY_REPOSITORY)
    private readonly activity: BrioActivityRepositoryPort,
    @Inject(BRIO_BODY_REPOSITORY)
    private readonly body: BrioBodyRepositoryPort,
    @Inject(BRIO_PROFILE_REPOSITORY)
    private readonly profiles: BrioProfileRepositoryPort,
    private readonly refreshDailyLog: RefreshDailyLogUseCase,
  ) {}

  async execute(
    id: string,
    userId: string,
    input: UpdateActivitySessionInput,
  ): Promise<ActivitySession> {
    const session = await this.activity.findSession(id, userId);
    if (!session) throw new BrioActivitySessionNotFoundError(id);

    const data: UpdateSessionData = { ...input };

    if (input.startedAt) {
      const profile = await this.profiles.findByUserId(userId);
      data.loggedOn = dayInTimezone(
        input.startedAt,
        profile?.timezone ?? 'Europe/Madrid',
      );
    }

    const durationSec = input.durationSec ?? session.durationSec;
    const effort = input.effort === undefined ? session.effort : input.effort;
    if (durationSec !== session.durationSec || effort !== session.effort) {
      const [type, weightKg] = await Promise.all([
        this.activity.findTypeVisibleTo(session.activityTypeId, userId),
        this.body.latestWeightKg(userId),
      ]);
      // Sin tipo visible o sin peso no se puede reestimar: se conserva el valor.
      if (type && weightKg !== null) {
        data.kcalBurned = sessionKcal({
          met: type.met,
          weightKg,
          durationSec,
          effort,
        });
      }
    }

    await this.activity.updateSession(id, userId, data);
    await this.refreshDailyLog.execute(userId, session.loggedOn);
    if (data.loggedOn && data.loggedOn !== session.loggedOn) {
      await this.refreshDailyLog.execute(userId, data.loggedOn);
    }
    return (await this.activity.findSession(id, userId)) ?? session;
  }
}
