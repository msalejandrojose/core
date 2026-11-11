import { Inject, Injectable } from '@nestjs/common';
import type { ActivitySession } from '../../domain/entities/activity-session.entity';
import type { DailyLog } from '../../domain/entities/daily-log.entity';
import type { MealEntry } from '../../domain/entities/meal-entry.entity';
import type { NutreProfile } from '../../domain/entities/nutre-profile.entity';
import { dayInTimezone } from '../../domain/services/calendar';
import {
  NUTRE_ACTIVITY_REPOSITORY,
  type NutreActivityRepositoryPort,
} from '../ports/nutre-activity-repository.port';
import {
  NUTRE_DIARY_REPOSITORY,
  type NutreDiaryRepositoryPort,
} from '../ports/nutre-diary-repository.port';
import {
  NUTRE_PROFILE_REPOSITORY,
  type NutreProfileRepositoryPort,
} from '../ports/nutre-profile-repository.port';

export interface DaySummary {
  day: string;
  log: DailyLog;
  meals: MealEntry[];
  sessions: ActivitySession[];
  profile: NutreProfile | null;
}

/**
 * Todo lo que necesita la pantalla principal de un día, en UNA llamada: el
 * agregado, las comidas y los entrenos. La app abre en esta pantalla, así que
 * tres round-trips se notarían en cada arranque.
 *
 * Si el día aún no tiene fila en `nutre_daily_log` se devuelve un agregado
 * vacío en memoria en vez de crearlo: un GET no debería escribir.
 */
@Injectable()
export class GetDaySummaryUseCase {
  constructor(
    @Inject(NUTRE_DIARY_REPOSITORY)
    private readonly diary: NutreDiaryRepositoryPort,
    @Inject(NUTRE_ACTIVITY_REPOSITORY)
    private readonly activity: NutreActivityRepositoryPort,
    @Inject(NUTRE_PROFILE_REPOSITORY)
    private readonly profiles: NutreProfileRepositoryPort,
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
