import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { PlannedSession } from '../../domain/entities/plan.entity';
import { shiftDay } from '../../domain/services/calendar';
import { againstBaseline } from '../../domain/services/garmin';
import {
  recoveryOptions,
  recoveryScore,
  type RecoveryOption,
  type RecoveryOptionId,
  type RecoveryScore,
} from '../../domain/services/recovery';
import {
  BRIO_GARMIN_REPOSITORY,
  type BrioGarminRepositoryPort,
} from '../ports/garmin.port';
import {
  BRIO_PLAN_REPOSITORY,
  type PlannedSessionData,
  type BrioPlanRepositoryPort,
} from '../ports/brio-plan-repository.port';
import { GetFatigueAnalysisUseCase } from './get-fatigue-analysis.use-case';
import { PerformanceDataLoader } from './performance-data.loader';
import { fromTemplate } from './plan.use-cases';

export interface RecoveryView extends RecoveryScore {
  today: string;
  /** true si hay datos del reloj; si no, la puntuación sale solo de la carga. */
  hasHealthData: boolean;
  load: { status: string; ratio: number | null; weekChangePct: number | null };
  tomorrow: {
    day: string;
    kind: string;
    title: string;
    load: string;
    plannedDurationMin: number | null;
  } | null;
  options: RecoveryOption[];
}

const dataOf = (p: PlannedSession): PlannedSessionData => ({
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
});

/** Estimación de recuperación de hoy y qué hacer con la sesión de mañana. */
@Injectable()
export class GetRecoveryUseCase {
  constructor(
    @Inject(BRIO_GARMIN_REPOSITORY)
    private readonly health: BrioGarminRepositoryPort,
    @Inject(BRIO_PLAN_REPOSITORY)
    private readonly plans: BrioPlanRepositoryPort,
    private readonly loader: PerformanceDataLoader,
    private readonly fatigue: GetFatigueAnalysisUseCase,
  ) {}

  async execute(userId: string): Promise<RecoveryView> {
    const { today } = await this.loader.load(userId);
    const [days, fatigue, planned] = await Promise.all([
      this.health.dailyHealth(userId, shiftDay(today, -35), today),
      this.fatigue.execute(userId, '30d'),
      this.plans.plannedBetween(userId, shiftDay(today, 1), shiftDay(today, 2)),
    ]);
    const sleep = againstBaseline(days, (d) => d.sleepSec);
    const hrv = againstBaseline(days, (d) => d.hrvMs);
    const restingHr = againstBaseline(days, (d) => d.restingHr);
    const load = {
      status: fatigue.load.status,
      ratio: fatigue.load.ratio,
      weekChangePct: fatigue.load.weekChangePct,
    };
    const score = recoveryScore({
      sleep,
      hrv,
      restingHr,
      load,
      demandingLast7: fatigue.demanding.last7,
      streakDays: fatigue.rest.currentStreakDays,
    });
    const tomorrow = planned.find((p) => p.day === shiftDay(today, 1)) ?? null;
    const dayAfter = planned.find((p) => p.day === shiftDay(today, 2)) ?? null;
    return {
      ...score,
      today,
      hasHealthData: [sleep, hrv, restingHr].some((b) => b.latest !== null),
      load,
      tomorrow: tomorrow && {
        day: tomorrow.day,
        kind: tomorrow.kind,
        title: tomorrow.title,
        load: tomorrow.load,
        plannedDurationMin: tomorrow.plannedDurationMin,
      },
      options: recoveryOptions(score.level, tomorrow, dayAfter),
    };
  }
}

/**
 * Aplica una de las propuestas al plan: suavizar o descansar cambia la sesión
 * de mañana; mover la intercambia con la del día siguiente.
 */
@Injectable()
export class ApplyRecoveryOptionUseCase {
  constructor(
    @Inject(BRIO_PLAN_REPOSITORY)
    private readonly plans: BrioPlanRepositoryPort,
    private readonly recovery: GetRecoveryUseCase,
  ) {}

  async execute(userId: string, id: RecoveryOptionId): Promise<RecoveryView> {
    const view = await this.recovery.execute(userId);
    const option = view.options.find((o) => o.id === id);
    if (!option || !view.tomorrow)
      throw new BadRequestException('BRIO_RECOVERY_OPTION_UNAVAILABLE');
    if (id === 'KEEP') return view;

    const tomorrowDay = view.tomorrow.day;
    const afterDay = shiftDay(tomorrowDay, 1);
    const [plan, current, after] = await Promise.all([
      this.plans.findActivePlan(userId),
      this.plans.findPlanned(userId, tomorrowDay),
      this.plans.findPlanned(userId, afterDay),
    ]);
    if (!current)
      throw new BadRequestException('BRIO_RECOVERY_OPTION_UNAVAILABLE');
    const planId = plan?.id ?? null;

    if (id === 'MOVE') {
      await this.plans.upsertPlanned(userId, afterDay, planId, dataOf(current));
      if (after)
        await this.plans.upsertPlanned(
          userId,
          tomorrowDay,
          planId,
          dataOf(after),
        );
      else await this.plans.deletePlanned(userId, tomorrowDay);
    } else {
      const data = option.templateCode
        ? fromTemplate(option.templateCode, { startTime: current.startTime })
        : null;
      if (!data)
        throw new BadRequestException('BRIO_RECOVERY_OPTION_UNAVAILABLE');
      // La sesión suave de carrera dura menos que un rodaje normal.
      if (option.templateCode === 'z2')
        Object.assign(data, { title: 'Rodaje suave', plannedDurationMin: 35 });
      await this.plans.upsertPlanned(userId, tomorrowDay, planId, data);
    }
    return this.recovery.execute(userId);
  }
}
