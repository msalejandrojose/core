import { Inject, Injectable } from '@nestjs/common';
import type { BodyMeasurement } from '../../domain/entities/body-measurement.entity';
import type { DailyLog } from '../../domain/entities/daily-log.entity';
import { dayInTimezone, shiftDay } from '../../domain/services/calendar';
import {
  RITMO_BODY_REPOSITORY,
  type RitmoBodyRepositoryPort,
} from '../ports/ritmo-body-repository.port';
import {
  RITMO_DIARY_REPOSITORY,
  type RitmoDiaryRepositoryPort,
} from '../ports/ritmo-diary-repository.port';
import {
  RITMO_PROFILE_REPOSITORY,
  type RitmoProfileRepositoryPort,
} from '../ports/ritmo-profile-repository.port';

export interface Progress {
  from: string;
  to: string;
  measurements: BodyMeasurement[];
  logs: DailyLog[];
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
    @Inject(RITMO_BODY_REPOSITORY)
    private readonly body: RitmoBodyRepositoryPort,
    @Inject(RITMO_DIARY_REPOSITORY)
    private readonly diary: RitmoDiaryRepositoryPort,
    @Inject(RITMO_PROFILE_REPOSITORY)
    private readonly profiles: RitmoProfileRepositoryPort,
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

    const [measurements, logs] = await Promise.all([
      this.body.listBetween(input.userId, from, to),
      this.diary.listDailyLogsBetween(input.userId, from, to),
    ]);

    return { from, to, measurements, logs };
  }
}
