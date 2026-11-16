import type { DayTotals } from '../api';
import { formatNumber } from '../format';
import type { DayStatus, PlanDay } from '../plan/plan.api';

/**
 * Lo que dibuja la cabecera de Hoy: saludo, anillos del día, barras de macros
 * y la tira de la semana. Puro, para poder probarlo.
 */

/** «Buenos días, Ana» según la hora; sin nombre, solo el saludo. */
export function greeting(hour: number, firstName?: string | null): string {
  const base = hour >= 6 && hour < 13 ? 'Buenos días' : hour >= 13 && hour < 21 ? 'Buenas tardes' : 'Buenas noches';
  const name = firstName?.trim().split(/\s+/)[0];
  return name ? `${base}, ${name}` : base;
}

export interface DayRing {
  key: 'food' | 'move' | 'steps';
  label: string;
  /** Texto del valor («1.240 kcal quedan»). */
  value: string;
  ratio: number;
  color: string;
  soft: string;
}

/** Pasos al día si no hay otro objetivo. */
export const DEFAULT_STEPS_GOAL = 10_000;
/** Minutos de entreno de un día sin plan. */
export const DEFAULT_MOVE_MIN = 30;

const fmt = (n: number) => formatNumber(Math.round(n));
const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);

/**
 * Tres anillos: lo comido frente a lo disponible (objetivo + parte del gasto
 * que cuenta), minutos de entreno frente a lo planificado (o 30) y pasos.
 * Los pasos solo salen si el teléfono o el reloj los dan.
 */
export function dayRings(input: {
  totals: DayTotals;
  activeMinutes: number;
  plannedMinutes: number | null;
  steps: number | null;
  stepsGoal?: number;
}): DayRing[] {
  const { totals } = input;
  const available = totals.kcalTarget ? totals.kcalTarget + totals.kcalBurnedCounted : null;
  const remaining = totals.kcalRemaining;
  const moveGoal = input.plannedMinutes && input.plannedMinutes > 0 ? input.plannedMinutes : DEFAULT_MOVE_MIN;
  const rings: DayRing[] = [
    {
      key: 'food',
      label: 'Comida',
      value:
        remaining === null
          ? `${fmt(totals.kcalIn)} kcal hoy`
          : remaining >= 0
            ? `${fmt(remaining)} kcal quedan`
            : `${fmt(-remaining)} kcal de más`,
      ratio: available ? clamp(totals.kcalIn / available) : 0,
      color: 'var(--brio-food)',
      soft: 'var(--brio-food-soft)',
    },
    {
      key: 'move',
      label: 'Entreno',
      value: `${fmt(input.activeMinutes)} de ${fmt(moveGoal)} min`,
      ratio: clamp(input.activeMinutes / moveGoal),
      color: 'var(--brio-activity)',
      soft: 'var(--brio-activity-soft)',
    },
  ];
  if (input.steps !== null && input.steps !== undefined) {
    const goal = input.stepsGoal ?? DEFAULT_STEPS_GOAL;
    rings.push({
      key: 'steps',
      label: 'Pasos',
      value: `${fmt(input.steps)} pasos`,
      ratio: clamp(input.steps / goal),
      color: 'var(--brio-info)',
      soft: 'var(--brio-tint-soft)',
    });
  }
  return rings;
}

export interface MacroBar {
  key: 'protein' | 'carbs' | 'fat';
  label: string;
  grams: number;
  target: number | null;
  ratio: number;
  color: string;
}

/** Proteína, hidratos y grasa frente a su objetivo del día (el de la dieta del plan si lo hay). */
export function macroBars(
  totals: Pick<DayTotals, 'proteinG' | 'carbsG' | 'fatG'>,
  targets: { proteinG: number | null; carbsG: number | null; fatG: number | null },
): MacroBar[] {
  const bar = (key: MacroBar['key'], label: string, grams: number, target: number | null, color: string): MacroBar => ({
    key,
    label,
    grams: Math.round(grams),
    target: target ? Math.round(target) : null,
    ratio: target ? clamp(grams / target) : 0,
    color,
  });
  return [
    bar('protein', 'Proteína', totals.proteinG, targets.proteinG, 'var(--brio-sleep)'),
    bar('carbs', 'Hidratos', totals.carbsG, targets.carbsG, 'var(--brio-gold)'),
    bar('fat', 'Grasa', totals.fatG, targets.fatG, 'var(--brio-heart)'),
  ];
}

export type WeekDotState = 'done' | 'today' | 'missed' | 'planned' | 'rest' | 'free';

export interface WeekDot {
  day: string;
  letter: string;
  state: WeekDotState;
  /** Texto para lectores de pantalla («martes: hecho»). */
  label: string;
}

const LETTERS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const DAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const STATE_TEXT: Record<WeekDotState, string> = {
  done: 'hecho',
  today: 'hoy',
  missed: 'no se hizo',
  planned: 'planificado',
  rest: 'descanso',
  free: 'sin plan',
};

const FROM_STATUS: Record<DayStatus, WeekDotState> = {
  DONE: 'done',
  TODAY: 'today',
  MISSED: 'missed',
  SKIPPED: 'missed',
  PLANNED: 'planned',
  REST: 'rest',
  FREE: 'free',
};

/** Un punto por día de la semana del plan. Hoy siempre es «hoy», aunque ya esté hecho. */
export function weekDots(days: Pick<PlanDay, 'day' | 'status'>[], today: string): WeekDot[] {
  return days.map((d) => {
    const weekday = new Date(`${d.day}T12:00:00Z`).getUTCDay();
    const state: WeekDotState = d.day === today ? 'today' : FROM_STATUS[d.status] ?? 'free';
    return {
      day: d.day,
      letter: LETTERS[weekday],
      state,
      label: `${DAY_NAMES[weekday]}: ${d.day === today && d.status === 'DONE' ? 'hecho hoy' : STATE_TEXT[state]}`,
    };
  });
}
