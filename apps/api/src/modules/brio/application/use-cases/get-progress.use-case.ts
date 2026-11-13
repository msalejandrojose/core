import { Inject, Injectable } from '@nestjs/common';
import type { BodyMeasurement } from '../../domain/entities/body-measurement.entity';
import type { DailyLog } from '../../domain/entities/daily-log.entity';
import { dayInTimezone, shiftDay } from '../../domain/services/calendar';
import {
  BRIO_ACTIVITY_REPOSITORY,
  type DaySessionStats,
  type BrioActivityRepositoryPort,
} from '../ports/brio-activity-repository.port';
import {
  BRIO_BODY_REPOSITORY,
  type BrioBodyRepositoryPort,
} from '../ports/brio-body-repository.port';
import {
  BRIO_DIARY_REPOSITORY,
  type DayMealCount,
  type BrioDiaryRepositoryPort,
} from '../ports/brio-diary-repository.port';
import {
  BRIO_PROFILE_REPOSITORY,
  type BrioProfileRepositoryPort,
} from '../ports/brio-profile-repository.port';

export interface Progress {
  from: string;
  to: string;
  measurements: BodyMeasurement[];
  logs: DailyLog[];
  /** Entrenos por día (solo días con alguno). */
  sessions: DaySessionStats[];
  /** Momentos del día con comida registrada (solo días con alguna). */
  meals: DayMealCount[];
}

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;

/**
 * Series para la pantalla de progreso: peso y balance calórico por día en una
 * ventana de días. Sin paginación por cursor a propósito — una serie temporal
 * acotada por rango no se pagina, se recorta por fechas (y el rango está
 * limitado a un año).
 */
@Injectable()
export class GetProgressUseCase {
  constructor(
    @Inject(BRIO_BODY_REPOSITORY)
    private readonly body: BrioBodyRepositoryPort,
    @Inject(BRIO_DIARY_REPOSITORY)
    private readonly diary: BrioDiaryRepositoryPort,
    @Inject(BRIO_PROFILE_REPOSITORY)
    private readonly profiles: BrioProfileRepositoryPort,
    @Inject(BRIO_ACTIVITY_REPOSITORY)
    private readonly activity: BrioActivityRepositoryPort,
  ) {}

  async execute(input: {
    userId: string;
    days?: number;
    to?: string;
  }): Promise<Progress> {
    const profile = await this.profiles.findByUserId(input.userId);
    const to =
      input.to ??
      dayInTimezone(new Date(), profile?.timezone ?? 'Europe/Madrid');
    const days = Math.min(Math.max(input.days ?? DEFAULT_DAYS, 1), MAX_DAYS);
    const from = shiftDay(to, -(days - 1));

    const [measurements, logs, sessions, meals] = await Promise.all([
      this.body.listBetween(input.userId, from, to),
      this.diary.listDailyLogsBetween(input.userId, from, to),
      this.activity.sessionStatsBetween(input.userId, from, to),
      this.diary.mealCountsBetween(input.userId, from, to),
    ]);

    return { from, to, measurements, logs, sessions, meals };
  }
}
