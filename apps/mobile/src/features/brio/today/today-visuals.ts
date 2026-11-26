import type { DayTotals } from '../api';
import { formatNumber } from '../format';
import type { DayStatus, PlanDay, PlanWorkout } from '../plan/plan.api';

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

/** El deporte que se pinta en el punto: lo que hiciste o, si no, lo planificado. */
export interface WeekSport {
  code?: string | null;
  kind?: string | null;
  name?: string | null;
}

export interface WeekDot {
  day: string;
  letter: string;
  state: WeekDotState;
  isToday: boolean;
  /** Icono del deporte; null en descanso o días sin nada. */
  sport: WeekSport | null;
  /** Entrenos de más ese día (fútbol + gimnasio → 1). */
  extra: number;
  /** Texto para lectores de pantalla («martes: Fútbol 7, hecho»). */
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

/**
 * Un punto por día de la semana. Cuándo sale el check (punto lleno con el
 * icono del deporte):
 * - si ese día registraste cualquier entreno (con plan o sin él, del deporte
 *   que sea, también hoy), o
 * - si marcaste a mano como hecha la sesión planificada.
 * Si no, el punto va vacío con el icono de lo planificado: punteado si el día
 * ya pasó (no se hizo), normal si está por venir, y hoy resaltado.
 * Descanso y días sin nada no llevan icono.
 */
export function weekDots(
  days: (Pick<PlanDay, 'day' | 'status'> & Partial<Pick<PlanDay, 'planned' | 'actual' | 'workouts'>>)[],
  today: string,
): WeekDot[] {
  return days.map((d) => {
    const weekday = new Date(`${d.day}T12:00:00Z`).getUTCDay();
    const isToday = d.day === today;
    // Sin la lista nueva (API antigua), al menos el entreno que cumple el plan.
    const workouts: PlanWorkout[] = d.workouts ?? (d.actual ? [d.actual] : []);
    const trained = workouts.length > 0;
    const state: WeekDotState =
      trained || d.status === 'DONE' ? 'done' : isToday ? 'today' : (FROM_STATUS[d.status] ?? 'free');
    const planned = d.planned && d.planned.load !== 'REST' ? d.planned : null;
    const sport: WeekSport | null = trained
      ? { code: workouts[0].code ?? null, kind: workouts[0].kind, name: workouts[0].title }
      : planned
        ? { kind: planned.kind, name: planned.title }
        : null;
    const what = trained ? workouts.map((w) => w.title).join(' y ') : (planned?.title ?? null);
    const status = state === 'done' && isToday ? 'hecho hoy' : STATE_TEXT[state];
    return {
      day: d.day,
      letter: LETTERS[weekday],
      state,
      isToday,
      sport,
      extra: Math.max(0, workouts.length - 1),
      label: `${DAY_NAMES[weekday]}${isToday && state !== 'today' ? ' (hoy)' : ''}: ${what ? `${what}, ` : ''}${status}`,
    };
  });
}
