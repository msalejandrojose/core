import { formatDistance, formatNumber } from '../format';

/**
 * Lo que se enseña al abrir un entreno de la lista «Entrenaste N veces» y
 * cómo se resuelve el gesto de deslizar para borrarlo. Puro, para probarlo.
 */

export interface DoneWorkoutInfo {
  /** «18:30», ya en la zona horaria del usuario. */
  startTime?: string | null;
  distanceM?: number | null;
  avgHeartRate?: number | null;
  rpe?: number | null;
  effort?: 'LIGHT' | 'MODERATE' | 'VIGOROUS' | null;
  /** Series de fuerza (sin calentamiento) y ejercicios distintos. */
  sets?: { exerciseId: string; isWarmup: boolean }[];
  source?: string | null;
  notes?: string | null;
}

const EFFORT: Record<string, string> = { LIGHT: 'Suave', MODERATE: 'Moderado', VIGOROUS: 'Intenso' };
const SOURCE: Record<string, string> = {
  GARMIN: 'Garmin',
  HEALTHKIT: 'Salud',
  GOOGLE_FIT: 'Google Fit',
  STRAVA: 'Strava',
};

/** Datos cortos del entreno: hora, distancia, pulso, esfuerzo, series y origen. */
export function doneWorkoutFacts(w: DoneWorkoutInfo): string[] {
  const facts: string[] = [];
  if (w.startTime) facts.push(`A las ${w.startTime}`);
  if (w.distanceM && w.distanceM > 0) facts.push(formatDistance(w.distanceM));
  if (w.avgHeartRate) facts.push(`${formatNumber(w.avgHeartRate)} ppm de media`);
  if (w.rpe) facts.push(`Esfuerzo ${w.rpe}/10`);
  else if (w.effort) facts.push(EFFORT[w.effort] ?? '');
  const work = (w.sets ?? []).filter((s) => !s.isWarmup);
  if (work.length) {
    const exercises = new Set(work.map((s) => s.exerciseId)).size;
    facts.push(`${exercises} ${exercises === 1 ? 'ejercicio' : 'ejercicios'} · ${work.length} ${work.length === 1 ? 'serie' : 'series'}`);
  }
  if (w.source && SOURCE[w.source]) facts.push(`De ${SOURCE[w.source]}`);
  return facts.filter(Boolean);
}

/** Ancho del botón «Eliminar» que asoma al deslizar. */
export const SWIPE_ACTION_W = 88;

/**
 * Al soltar el dedo: si se arrastró más de media acción queda abierto; si se
 * arrastró casi toda la fila (como en iOS), se borra directamente.
 */
export function swipeRelease(dx: number, rowWidth: number, wasOpen = false): 'open' | 'closed' | 'delete' {
  const pulled = -dx + (wasOpen ? SWIPE_ACTION_W : 0);
  if (rowWidth > 0 && pulled > rowWidth * 0.6) return 'delete';
  return pulled > SWIPE_ACTION_W / 2 ? 'open' : 'closed';
}
