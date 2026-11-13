import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Plan, PlannedSession } from '../../domain/entities/plan.entity';
import { RitmoActivitySessionNotFoundError } from '../../domain/errors/ritmo-activity-session-not-found.error';
import { dayInTimezone, shiftDay } from '../../domain/services/calendar';
import {
  DEFAULT_WEEK,
  buildWeek,
  templateByCode,
  weekDays,
  weekDiet,
  type DayDiet,
  type WeekView,
} from '../../domain/services/plan';
import {
  RITMO_ACTIVITY_REPOSITORY,
  type RitmoActivityRepositoryPort,
} from '../ports/ritmo-activity-repository.port';
import {
  RITMO_PLAN_REPOSITORY,
  type PlannedSessionData,
  type RitmoPlanRepositoryPort,
  type SavePlanData,
} from '../ports/ritmo-plan-repository.port';
import {
  RITMO_PROFILE_REPOSITORY,
  type RitmoProfileRepositoryPort,
} from '../ports/ritmo-profile-repository.port';

// Casos de uso del plan de entrenamiento. Van juntos en un archivo porque son
// cortos y comparten el mismo repositorio; cada clase sigue siendo un caso de uso.

/** Días que faltan para la carrera (negativo si ya pasó). */
function daysTo(raceDate: string | null, today: string): number | null {
  if (!raceDate) return null;
  return Math.round((Date.parse(raceDate) - Date.parse(today)) / 86_400_000);
}

export interface PlanWithCountdown extends Plan {
  daysToRace: number | null;
  weeksToRace: number | null;
}

export interface PlanWeek extends WeekView {
  today: string;
  plan: PlanWithCountdown | null;
  /** Calorías y macros de cada día según su carga; null sin objetivo de kcal. */
  diet: DayDiet[] | null;
  /** kcal de referencia: el objetivo diario del perfil. */
  baseKcal: number | null;
}

@Injectable()
export class GetPlanWeekUseCase {
  constructor(
    @Inject(RITMO_PLAN_REPOSITORY)
    private readonly plans: RitmoPlanRepositoryPort,
    @Inject(RITMO_PROFILE_REPOSITORY)
    private readonly profiles: RitmoProfileRepositoryPort,
  ) {}

  async execute(userId: string, day: string | null): Promise<PlanWeek> {
    const profile = await this.profiles.findByUserId(userId);
    const today = dayInTimezone(
      new Date(),
      profile?.timezone ?? 'Europe/Madrid',
    );
    const dates = weekDays(day ?? today);
    const [planned, actuals, plan] = await Promise.all([
      this.plans.plannedBetween(userId, dates[0], dates[6]),
      this.plans.actualsBetween(userId, dates[0], dates[6]),
      this.plans.findActivePlan(userId),
    ]);
    const week = buildWeek(day ?? today, today, planned, actuals);
    const baseKcal = profile?.dailyKcalTarget ?? null;
    const toRace = daysTo(plan?.raceDate ?? null, today);
    return {
      ...week,
      today,
      plan: plan
        ? {
            ...plan,
            daysToRace: toRace,
            weeksToRace: toRace === null ? null : Math.ceil(toRace / 7),
          }
        : null,
      baseKcal,
      diet:
        baseKcal === null
          ? null
          : weekDiet(
              // Un día sin nada planificado cuenta como descanso para la dieta.
              week.days.map((d) => ({
                day: d.day,
                load: d.planned?.load ?? 'REST',
              })),
              baseKcal,
              profile?.proteinTargetG ?? 0,
            ),
    };
  }
}

@Injectable()
export class SavePlanUseCase {
  constructor(
    @Inject(RITMO_PLAN_REPOSITORY)
    private readonly plans: RitmoPlanRepositoryPort,
  ) {}

  execute(userId: string, data: SavePlanData): Promise<Plan> {
    return this.plans.saveActivePlan(userId, data);
  }
}

@Injectable()
export class ArchivePlanUseCase {
  constructor(
    @Inject(RITMO_PLAN_REPOSITORY)
    private readonly plans: RitmoPlanRepositoryPort,
  ) {}

  async execute(userId: string): Promise<void> {
    await this.plans.archiveActivePlan(userId);
  }
}

/** Datos de una sesión a partir de una plantilla, con los cambios encima. */
export function fromTemplate(
  code: string,
  changes: Partial<PlannedSessionData> = {},
): PlannedSessionData | null {
  const t = templateByCode(code);
  if (!t) return null;
  return {
    kind: t.kind,
    templateCode: t.code,
    title: t.title,
    load: t.load,
    startTime: null,
    plannedDurationMin: t.durationMin,
    plannedDistanceM: t.distanceM,
    targetPaceSecPerKm: null,
    structure: t.structure,
    notes: null,
    ...changes,
  };
}

@Injectable()
export class SetPlannedDayUseCase {
  constructor(
    @Inject(RITMO_PLAN_REPOSITORY)
    private readonly plans: RitmoPlanRepositoryPort,
  ) {}

  async execute(
    userId: string,
    day: string,
    data: PlannedSessionData,
  ): Promise<PlannedSession> {
    const plan = await this.plans.findActivePlan(userId);
    return this.plans.upsertPlanned(userId, day, plan?.id ?? null, data);
  }
}

@Injectable()
export class ClearPlannedDayUseCase {
  constructor(
    @Inject(RITMO_PLAN_REPOSITORY)
    private readonly plans: RitmoPlanRepositoryPort,
  ) {}

  async execute(userId: string, day: string): Promise<void> {
    await this.plans.deletePlanned(userId, day);
  }
}

export interface CompleteDayInput {
  /** true = hecha; false = quitar el check. */
  done: boolean;
  /** Marcarla como «no la voy a hacer». */
  skipped?: boolean;
  /** Entreno real con el que se cumplió. */
  sessionId?: string | null;
  /** Lo que se hizo de verdad: distancia, ritmo, sensaciones. */
  actualNotes?: string | null;
}

/** Check diario: marcar una sesión como hecha (o no) con notas de lo ejecutado. */
@Injectable()
export class CompletePlannedDayUseCase {
  constructor(
    @Inject(RITMO_PLAN_REPOSITORY)
    private readonly plans: RitmoPlanRepositoryPort,
    @Inject(RITMO_ACTIVITY_REPOSITORY)
    private readonly activity: RitmoActivityRepositoryPort,
  ) {}

  async execute(
    userId: string,
    day: string,
    input: CompleteDayInput,
  ): Promise<PlannedSession> {
    if (input.sessionId) {
      const session = await this.activity.findSession(input.sessionId, userId);
      if (!session)
        throw new RitmoActivitySessionNotFoundError(input.sessionId);
    }
    const updated = await this.plans.setCompletion(userId, day, {
      completedAt: input.done ? new Date() : null,
      completedSessionId: input.done ? (input.sessionId ?? null) : null,
      actualNotes: input.actualNotes?.trim() || null,
      skipped: !input.done && !!input.skipped,
    });
    if (!updated)
      throw new NotFoundException('RITMO_PLANNED_SESSION_NOT_FOUND');
    return updated;
  }
}

export type FillMode = 'TEMPLATE' | 'COPY_PREVIOUS';

/**
 * Rellenar una semana de golpe: con la semana tipo o repitiendo la anterior.
 * Solo toca los días vacíos, salvo que se pida sustituir.
 */
@Injectable()
export class FillPlanWeekUseCase {
  constructor(
    @Inject(RITMO_PLAN_REPOSITORY)
    private readonly plans: RitmoPlanRepositoryPort,
  ) {}

  async execute(
    userId: string,
    day: string,
    mode: FillMode,
    replace: boolean,
  ): Promise<number> {
    const dates = weekDays(day);
    const [existing, plan] = await Promise.all([
      this.plans.plannedBetween(userId, dates[0], dates[6]),
      this.plans.findActivePlan(userId),
    ]);
    const taken = new Set(existing.map((p) => p.day));

    let source: (PlannedSessionData | null)[];
    if (mode === 'TEMPLATE') {
      source = DEFAULT_WEEK.map((code) => fromTemplate(code));
    } else {
      const previous = await this.plans.plannedBetween(
        userId,
        shiftDay(dates[0], -7),
        shiftDay(dates[6], -7),
      );
      source = dates.map((date) => {
        const p = previous.find((x) => x.day === shiftDay(date, -7));
        if (!p) return null;
        return {
          kind: p.kind,
          templateCode: p.templateCode,
          title: p.title,
          load: p.load,
          startTime: p.startTime,
          plannedDurationMin: p.plannedDurationMin,
          plannedDistanceM: p.plannedDistanceM,
          targetPaceSecPerKm: p.targetPaceSecPerKm,
          structure: p.structure,
          notes: p.notes,
        };
      });
    }

    let written = 0;
    for (const [i, data] of source.entries()) {
      if (!data || (taken.has(dates[i]) && !replace)) continue;
      await this.plans.upsertPlanned(userId, dates[i], plan?.id ?? null, data);
      written += 1;
    }
    return written;
  }
}
