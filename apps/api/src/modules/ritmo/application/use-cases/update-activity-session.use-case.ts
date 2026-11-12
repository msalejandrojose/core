import { Inject, Injectable } from '@nestjs/common';
import type {
  ActivitySession,
  Effort,
} from '../../domain/entities/activity-session.entity';
import { RitmoActivitySessionNotFoundError } from '../../domain/errors/ritmo-activity-session-not-found.error';
import { dayInTimezone } from '../../domain/services/calendar';
import { sessionKcal } from '../../domain/services/energy';
import {
  RITMO_ACTIVITY_REPOSITORY,
  type RitmoActivityRepositoryPort,
  type UpdateSessionData,
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
    @Inject(RITMO_ACTIVITY_REPOSITORY)
    private readonly activity: RitmoActivityRepositoryPort,
    @Inject(RITMO_BODY_REPOSITORY)
    private readonly body: RitmoBodyRepositoryPort,
    @Inject(RITMO_PROFILE_REPOSITORY)
    private readonly profiles: RitmoProfileRepositoryPort,
    private readonly refreshDailyLog: RefreshDailyLogUseCase,
  ) {}

  async execute(
    id: string,
    userId: string,
    input: UpdateActivitySessionInput,
  ): Promise<ActivitySession> {
    const session = await this.activity.findSession(id, userId);
    if (!session) throw new RitmoActivitySessionNotFoundError(id);

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
