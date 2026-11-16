import type { Measure } from '../performance/perf.api';

/** Formatos y conversiones de las medidas que no son repeticiones. */

/** «4:05» o «1:02:30» → segundos; null si no se entiende. */
export function parseTime(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t);
  const parts = t.split(':').map((x) => Number(x));
  if (parts.some((n) => !Number.isFinite(n)) || parts.length > 3) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0) || null;
}

export function formatTime(sec: number | null | undefined): string {
  if (!sec) return '';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** «1 km», «250 m». */
export function formatDistance(m: number | null | undefined): string {
  if (!m) return '';
  return m >= 1000 && m % 100 === 0 ? `${String(m / 1000).replace('.', ',')} km` : `${m} m`;
}

/** Objetivo de una serie en texto: «8 reps», «1 km», «1:00», «15 cal». */
export function targetLabel(e: {
  measure?: Measure;
  reps: number;
  distanceM?: number | null;
  durationSec?: number | null;
  calories?: number | null;
}): string {
  switch (e.measure ?? 'REPS') {
    case 'DISTANCE':
      return formatDistance(e.distanceM) || 'distancia libre';
    case 'TIME':
      return formatTime(e.durationSec) || 'tiempo libre';
    case 'CALORIES':
      return e.calories ? `${e.calories} cal` : 'calorías libres';
    default:
      return `${e.reps} reps`;
  }
}

export const MEASURE_LABEL: Record<Measure, string> = {
  REPS: 'Repeticiones',
  DISTANCE: 'Metros',
  TIME: 'Tiempo',
  CALORIES: 'Calorías',
};
