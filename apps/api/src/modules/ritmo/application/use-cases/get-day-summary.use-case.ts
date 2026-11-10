import { Inject, Injectable } from '@nestjs/common';
import type { ActivitySession } from '../../domain/entities/activity-session.entity';
import type { DailyLog } from '../../domain/entities/daily-log.entity';
import type { MealEntry } from '../../domain/entities/meal-entry.entity';
import type { RitmoProfile } from '../../domain/entities/ritmo-profile.entity';
import { dayInTimezone } from '../../domain/services/calendar';
import {
  RITMO_ACTIVITY_REPOSITORY,
  type RitmoActivityRepositoryPort,
} from '../ports/ritmo-activity-repository.port';
import {
  RITMO_DIARY_REPOSITORY,
  type RitmoDiaryRepositoryPort,
} from '../ports/ritmo-diary-repository.port';
import {
  RITMO_PROFILE_REPOSITORY,
  type RitmoProfileRepositoryPort,
} from '../ports/ritmo-profile-repository.port';

export interface DaySummary {
  day: string;
  log: DailyLog;
  meals: MealEntry[];
  sessions: ActivitySession[];
  profile: RitmoProfile | null;
}

/**
 * Todo lo que necesita la pantalla principal de un día, en UNA llamada: el
 * agregado, las comidas y los entrenos. La app abre en esta pantalla, así que
 * tres round-trips se notarían en cada arranque.
 *
 * Si el día aún no tiene fila en `ritmo_daily_log` se devuelve un agregado
 * vacío en memoria en vez de crearlo: un GET no debería escribir.
 */
@Injectable()
export class GetDaySummaryUseCase {
  constructor(
    @Inject(RITMO_DIARY_REPOSITORY)
    private readonly diary: RitmoDiaryRepositoryPort,
    @Inject(RITMO_ACTIVITY_REPOSITORY)
    private readonly activity: RitmoActivityRepositoryPort,
    @Inject(RITMO_PROFILE_REPOSITORY)
    private readonly profiles: RitmoProfileRepositoryPort,
  ) {}

  async execute(userId: string, requestedDay?: string): Promise<DaySummary> {
    const profile = await this.profiles.findByUserId(userId);
    const day =
      requestedDay ??
      dayInTimezone(new Date(), profile?.timezone ?? 'Europe/Madrid');

    const [log, meals, sessions] = await Promise.all([
      this.diary.findDailyLog(userId, day),
      this.diary.listMealEntriesByDay(userId, day),
      this.activity.listSessionsByDay(userId, day),
    ]);

    return {
      day,
      log: log ?? emptyLog(userId, day, profile?.dailyKcalTarget ?? null),
      meals,
      sessions,
      profile,
    };
  }
}

function emptyLog(
  userId: string,
  day: string,
  kcalTarget: number | null,
): DailyLog {
  return {
    userId,
    logDate: day,
    kcalIn: 0,
    kcalBurned: 0,
    kcalTarget,
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    steps: null,
    waterMl: null,
    weightKg: null,
  };
}
