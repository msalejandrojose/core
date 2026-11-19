import type { GoalType, BrioProfile } from '../api';

/**
 * Objetivo de peso: peso meta + ritmo semanal. Es lo único que decide las
 * calorías del día (la API suma o resta `ritmo × 7700 / 7` a tu gasto), así que
 * el alta, Dieta y menú y Nuevo objetivo lo leen y lo escriben desde aquí.
 */

/** kcal de grasa por kilo (igual que KCAL_PER_KG_FAT en la API). */
export const KCAL_PER_KG = 7700;
/** Diferencia con el peso actual por debajo de la cual se considera «mantener». */
const SAME_WEIGHT_KG = 0.5;

export type PaceId = 'suave' | 'normal' | 'rapido';
export interface Pace {
  id: PaceId;
  label: string;
  kg: number;
}
/** Ritmos por semana. El «normal» es el recomendado; el rápido sigue dentro de lo que la API acepta (±1). */
export const PACES: Record<'lose' | 'gain', Pace[]> = {
  lose: [
    { id: 'suave', label: 'Suave', kg: 0.25 },
    { id: 'normal', label: 'Normal', kg: 0.5 },
    { id: 'rapido', label: 'Rápido', kg: 0.75 },
  ],
  gain: [
    { id: 'suave', label: 'Suave', kg: 0.1 },
    { id: 'normal', label: 'Normal', kg: 0.25 },
    { id: 'rapido', label: 'Rápido', kg: 0.4 },
  ],
};

export type Direction = 'lose' | 'gain' | 'maintain';

export function direction(currentKg: number, targetKg: number | null): Direction {
  if (targetKg === null || Math.abs(targetKg - currentKg) < SAME_WEIGHT_KG) return 'maintain';
  return targetKg < currentKg ? 'lose' : 'gain';
}

export function goalTypeOf(dir: Direction): GoalType {
  return dir === 'lose' ? 'LOSE_WEIGHT' : dir === 'gain' ? 'GAIN_MUSCLE' : 'MAINTAIN';
}

/** Ritmo con signo para la API: negativo para bajar, 0 para mantener. */
export function signedWeekly(dir: Direction, paceKg: number): number {
  return dir === 'lose' ? -paceKg : dir === 'gain' ? paceKg : 0;
}

/** kcal al día por encima (+) o por debajo (−) de tu gasto para ese ritmo. */
export function dailyDeltaKcal(weeklyKg: number): number {
  return Math.round((weeklyKg * KCAL_PER_KG) / 7 / 10) * 10;
}

/** Semanas hasta el peso meta a ese ritmo (null si no hay a dónde ir). */
export function weeksToGoal(currentKg: number, targetKg: number, weeklyKg: number): number | null {
  if (weeklyKg === 0) return null;
  const w = Math.abs(targetKg - currentKg) / Math.abs(weeklyKg);
  return w > 0 ? Math.ceil(w) : null;
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "12 feb" (o "12 feb 2028" si no es el año que viene o este). */
export function etaLabel(weeks: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + weeks * 7);
  const far = d.getFullYear() > from.getFullYear() + 1;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${far ? ` ${d.getFullYear()}` : ''}`;
}

/** Ritmo guardado → la opción más cercana (para precargar el selector). */
export function paceFor(dir: Direction, weeklyKg: number | null): PaceId {
  if (dir === 'maintain' || weeklyKg === null) return 'normal';
  const list = PACES[dir];
  return list.reduce((best, p) => (Math.abs(p.kg - Math.abs(weeklyKg)) < Math.abs(best.kg - Math.abs(weeklyKg)) ? p : best)).id;
}

export interface GoalSummary {
  /** `none`: no hay peso meta (se come para mantener). */
  kind: 'none' | Direction;
  targetKg: number | null;
  weeklyKg: number;
  /** Objetivo diario frente al gasto (TDEE), según la API. */
  deltaKcal: number | null;
  etaWeeks: number | null;
}

/** Lo que hay guardado en el perfil, listo para enseñar. */
export function goalSummary(p: Pick<BrioProfile, 'targetWeightKg' | 'weeklyWeightChangeKg' | 'currentWeightKg' | 'tdeeKcal' | 'dailyKcalTarget'>): GoalSummary {
  const weekly = p.weeklyWeightChangeKg ?? 0;
  const deltaKcal = p.tdeeKcal !== null && p.dailyKcalTarget !== null ? p.dailyKcalTarget - p.tdeeKcal : null;
  if (p.targetWeightKg === null) return { kind: 'none', targetKg: null, weeklyKg: weekly, deltaKcal, etaWeeks: null };
  const dir = p.currentWeightKg === null ? (weekly < 0 ? 'lose' : weekly > 0 ? 'gain' : 'maintain') : direction(p.currentWeightKg, p.targetWeightKg);
  return {
    kind: dir,
    targetKg: p.targetWeightKg,
    weeklyKg: weekly,
    deltaKcal,
    etaWeeks: p.currentWeightKg !== null ? weeksToGoal(p.currentWeightKg, p.targetWeightKg, weekly) : null,
  };
}
