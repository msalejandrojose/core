import type { DayTotals } from '../api';
import { formatNumber } from '../format';
import type { PlanDay } from '../plan/plan.api';
import { fmtMinutes } from '../plan/plan-labels';
import { activityLook } from '../ui/activity-look';
import { DEFAULT_MOVE_MIN, dayRings, macroBars, weekDots, type WeekDotState } from '../today/today-visuals';

/**
 * Lo que pintan los widgets de la pantalla de inicio de iOS (Hoy, Entreno de
 * hoy y Mi semana). La app lo calcula con los mismos datos que la pantalla
 * Hoy y lo deja en el App Group; los widgets solo lo leen. Puro, para probarlo.
 * El formato lo lee `native/ios/Shared/BrioWidgetSnapshot.swift`: si cambia
 * aquí, cambia allí (y sube `v`).
 */

/** Familia de deporte (`activity-look.ts`): el widget la traduce a un símbolo de iOS. */
export type SportFamily = ReturnType<typeof activityLook>['family'];

export interface WidgetSnapshot {
  v: 1;
  /** Día al que se refiere (YYYY-MM-DD, zona del perfil). Otro día = sin datos. */
  day: string;
  updatedAt: number;
  food: { label: string; remaining: number | null; eaten: number; ratio: number };
  move: { label: string; minutes: number; goal: number; ratio: number };
  steps: { label: string; value: number; ratio: number } | null;
  macros: { key: 'protein' | 'carbs' | 'fat'; label: string; grams: number; target: number | null; ratio: number }[];
  workout: {
    state: 'planned' | 'done' | 'rest' | 'none';
    /** «Hoy entrenas», «Entreno hecho»… */
    kicker: string;
    title: string | null;
    detail: string | null;
    family: SportFamily | null;
    /** Rutina del plan de hoy, para empezarla desde el widget. */
    routineId: string | null;
  };
  week: { day: string; letter: string; state: WeekDotState; isToday: boolean; family: SportFamily | null; extra: number }[];
}

export interface DoneSession {
  name: string;
  kind: string;
  code?: string | null;
  durationSec: number;
  kcal: number;
}

export interface SnapshotInput {
  day: string;
  totals: DayTotals;
  /** Entrenos registrados hoy. */
  done: DoneSession[];
  plan: PlanDay | null;
  week: PlanDay[];
  steps: number | null;
  macroTargets: { proteinG: number | null; carbsG: number | null; fatG: number | null };
  now?: number;
}

const round2 = (n: number) => Math.round(Math.max(0, n) * 100) / 100;

export function widgetSnapshot(input: SnapshotInput): WidgetSnapshot {
  const { day, totals, done, plan } = input;
  const activeMinutes = Math.round(done.reduce((m, s) => m + s.durationSec, 0) / 60);
  const planned = plan?.planned ?? null;
  const plannedMinutes = planned && planned.load !== 'REST' ? planned.plannedDurationMin : null;
  const moveGoal = plannedMinutes && plannedMinutes > 0 ? plannedMinutes : DEFAULT_MOVE_MIN;
  const rings = dayRings({ totals, activeMinutes, plannedMinutes, steps: input.steps });
  const ring = (key: string) => rings.find((r) => r.key === key);
  const food = ring('food')!;
  const move = ring('move')!;
  const steps = ring('steps');

  let workout: WidgetSnapshot['workout'];
  const routineId = typeof planned?.structure?.routineId === 'string' ? planned.structure.routineId : null;
  if (done.length) {
    const kcal = Math.round(done.reduce((t, s) => t + s.kcal, 0));
    workout = {
      state: 'done',
      kicker: done.length > 1 ? `Hoy has entrenado ${done.length} veces` : 'Entreno de hoy hecho',
      title: done.length > 1 ? done.map((s) => s.name).join(' + ') : done[0].name,
      detail: `${fmtMinutes(activeMinutes)} · ${formatNumber(kcal)} kcal`,
      family: activityLook({ code: done[0].code, kind: done[0].kind, name: done[0].name }).family,
      routineId: null,
    };
  } else if (planned && planned.load !== 'REST') {
    workout = {
      state: 'planned',
      kicker: planned.startTime ? `Hoy entrenas · ${planned.startTime}` : 'Hoy entrenas',
      title: planned.title,
      detail: planned.plannedDurationMin ? fmtMinutes(planned.plannedDurationMin) : null,
      family: activityLook({ kind: planned.kind, name: planned.title }).family,
      routineId,
    };
  } else if (planned) {
    workout = { state: 'rest', kicker: 'Hoy descansas', title: planned.title, detail: 'Recuperar también es entrenar', family: null, routineId: null };
  } else {
    workout = { state: 'none', kicker: 'Hoy', title: 'Sin entreno planificado', detail: null, family: null, routineId: null };
  }

  return {
    v: 1,
    day,
    updatedAt: input.now ?? Date.now(),
    food: { label: food.value, remaining: totals.kcalRemaining, eaten: Math.round(totals.kcalIn), ratio: round2(food.ratio) },
    move: { label: move.value, minutes: activeMinutes, goal: moveGoal, ratio: round2(move.ratio) },
    steps: steps ? { label: steps.value, value: input.steps ?? 0, ratio: round2(steps.ratio) } : null,
    macros: macroBars(totals, input.macroTargets).map((m) => ({ key: m.key, label: m.label, grams: m.grams, target: m.target, ratio: round2(m.ratio) })),
    workout,
    week: weekDots(input.week, day).map((d) => ({
      day: d.day,
      letter: d.letter,
      state: d.state,
      isToday: d.isToday,
      family: d.sport ? activityLook(d.sport).family : null,
      extra: d.extra,
    })),
  };
}
