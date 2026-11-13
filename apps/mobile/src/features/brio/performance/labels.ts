import { formatNumber } from '../format';
import type { Status, Trend } from './perf.api';

/** Textos y formatos de las pantallas de rendimiento, en un solo sitio. */

export const MUSCLE_NAME: Record<string, string> = {
  CHEST: 'Pectoral',
  LATS: 'Dorsales',
  TRAPS: 'Trapecio',
  FRONT_DELT: 'Deltoides anterior',
  SIDE_DELT: 'Deltoides lateral',
  REAR_DELT: 'Deltoides posterior',
  BICEPS: 'Bíceps',
  TRICEPS: 'Tríceps',
  FOREARMS: 'Antebrazos',
  QUADS: 'Cuádriceps',
  HAMSTRINGS: 'Isquiotibiales',
  GLUTES: 'Glúteos',
  CALVES: 'Gemelos',
  ABS: 'Abdominales',
  LOWER_BACK: 'Lumbar',
};

export const KIND_NAME: Record<string, string> = {
  RUN: 'Carrera',
  CYCLE: 'Bicicleta',
  WALK: 'Caminar',
  HIKE: 'Senderismo',
  SWIM: 'Natación',
  ELLIPTICAL: 'Elíptica',
  OTHER_CARDIO: 'Otro cardio',
  STRENGTH_LEGS: 'Pierna (fuerza)',
};

export const STATUS_LABEL: Record<Status, string> = {
  PROGRESSING: 'Progresando',
  POTENTIAL_PLATEAU: 'Posible estancamiento',
  REGRESSION: 'En retroceso',
  INSUFFICIENT_DATA: 'Faltan datos',
};
export const STATUS_TONE: Record<Status, 'good' | 'warn' | 'bad' | 'muted'> = {
  PROGRESSING: 'good',
  POTENTIAL_PLATEAU: 'warn',
  REGRESSION: 'bad',
  INSUFFICIENT_DATA: 'muted',
};

export const TREND_LABEL: Record<Trend, string> = {
  UP: 'Sube',
  STABLE: 'Estable',
  DOWN: 'Baja',
  INSUFFICIENT_DATA: 'Faltan datos',
};
export const TREND_TONE: Record<Trend, 'good' | 'warn' | 'bad' | 'muted'> = {
  UP: 'good',
  STABLE: 'muted',
  DOWN: 'bad',
  INSUFFICIENT_DATA: 'muted',
};

export const VERDICT_TEXT: Record<string, string> = {
  BOTH_PROGRESSING: 'Fuerza y cardio progresan a la vez.',
  STRENGTH_UP_CARDIO_DOWN: 'La fuerza sube mientras el cardio baja.',
  CARDIO_UP_STRENGTH_DOWN: 'El cardio sube mientras la fuerza baja.',
  STRENGTH_UP_CARDIO_FLAT: 'La fuerza sube; el cardio se mantiene.',
  CARDIO_UP_STRENGTH_FLAT: 'El cardio sube; la fuerza se mantiene.',
  BOTH_STALLED: 'Ni la fuerza ni el cardio mejoran ahora mismo.',
  BOTH_DECLINING: 'Fuerza y cardio bajan a la vez.',
  ONE_DECLINING: 'Una de las dos disciplinas está bajando.',
  INSUFFICIENT_DATA: 'Hacen falta varias semanas de fuerza y de cardio para comparar su evolución.',
};

export const LOAD_STATUS: Record<string, string> = {
  WELL_BELOW_USUAL: 'Muy por debajo de lo habitual',
  BELOW_USUAL: 'Por debajo de lo habitual',
  USUAL: 'En lo habitual',
  ABOVE_USUAL: 'Por encima de lo habitual',
  WELL_ABOVE_USUAL: 'Muy por encima de lo habitual',
  INSUFFICIENT_DATA: 'Faltan 4 semanas de historial',
};
export const LOAD_TONE: Record<string, 'good' | 'warn' | 'bad' | 'muted'> = {
  WELL_BELOW_USUAL: 'muted',
  BELOW_USUAL: 'muted',
  USUAL: 'good',
  ABOVE_USUAL: 'warn',
  WELL_ABOVE_USUAL: 'bad',
  INSUFFICIENT_DATA: 'muted',
};

export const RECOVERY_LABEL: Record<string, string> = {
  FRESH: 'Carga baja',
  NORMAL: 'Carga normal',
  LOADED: 'Carga alta',
  HIGH_LOAD: 'Carga muy alta',
  INSUFFICIENT_DATA: 'Faltan datos',
};

export const SIGNAL_LABEL: Record<string, string> = {
  NEW_PERSONAL_RECORD: 'Marca nueva',
  STRENGTH_UP: 'Más fuerza',
  NO_STRENGTH_GAIN: 'Sin mejora de fuerza',
  STRENGTH_DOWN: 'Menos fuerza',
  REPS_UP: 'Más repeticiones',
  NO_REP_GAIN: 'Sin más repeticiones',
  VOLUME_UP: 'Más volumen',
  VOLUME_STALLED: 'Volumen estable',
  VOLUME_DOWN: 'Menos volumen',
  TOO_FEW_SESSIONS: 'Pocas sesiones',
  TOO_SHORT_SPAN: 'Pocos días',
  EFFICIENCY_UP: 'Más eficiencia',
  EFFICIENCY_DOWN: 'Menos eficiencia',
  PACE_IMPROVED: 'Mejor brio',
  NO_PACE_GAIN: 'Sin mejora de brio',
  PACE_WORSE: 'Peor brio',
  HR_UP_AT_SIMILAR_PACE: 'Más pulsaciones al mismo brio',
  HR_DOWN_AT_SIMILAR_PACE: 'Menos pulsaciones al mismo brio',
  NEW_BEST_EFFORT: 'Mejor esfuerzo reciente',
  NO_BEST_EFFORT_PROGRESS: 'Sin mejor esfuerzo reciente',
  LOAD_UP_WITHOUT_GAIN: 'Más carga sin mejora',
};

export const BALANCE_FLAG: Record<string, string> = {
  NO_CARDIO: 'Llevas 2 semanas o más sin cardio.',
  NO_STRENGTH: 'Llevas 2 semanas o más sin fuerza.',
  MOSTLY_HARD: 'Más del 40 % de tus sesiones son exigentes.',
  NO_EASY_SESSIONS: 'No hay ninguna sesión suave en el periodo.',
};

export const ASSOCIATION: Record<string, string> = {
  NEGATIVE: 'Van en sentido contrario',
  POSITIVE: 'Van en el mismo sentido',
  NONE: 'Sin relación clara',
  INSUFFICIENT_DATA: 'Faltan semanas',
};

export const RACE_NAME: Record<string, string> = { '5K': '5 km', '10K': '10 km', HALF_MARATHON: 'Media maratón' };
export const ORIGIN_NAME: Record<string, string> = {
  LAB_TEST: 'Test de laboratorio',
  DEVICE: 'Dispositivo',
  FIELD_TEST: 'Test de campo',
};

/** 5:26 a partir de segundos por km. */
export function pace(sec: number | null): string {
  if (sec === null) return '—';
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** 49:00 o 1:48:07 a partir de segundos. */
export function clock(sec: number): string {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

/** +3,2 % con signo y coma decimal. */
export function pct(v: number | null, decimals = 1): string {
  if (v === null) return '—';
  const n = formatNumber(Math.abs(v), decimals);
  return `${v > 0 ? '+' : v < 0 ? '−' : ''}${n} %`;
}

/** 12 nov a partir de YYYY-MM-DD. */
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export function shortDay(day: string | null): string {
  if (!day) return '—';
  return `${Number(day.slice(8, 10))} ${MONTHS[Number(day.slice(5, 7)) - 1]}`;
}

export function minutes(sec: number): string {
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
}

/** Periodos que aceptan los motores, para los selectores. */
export const PERIOD_OPTIONS: { value: '7d' | '30d' | '90d' | '6m' | 'all'; label: string }[] = [
  { value: '7d', label: '7 d' },
  { value: '30d', label: '30 d' },
  { value: '90d', label: '90 d' },
  { value: '6m', label: '6 m' },
  { value: 'all', label: 'Todo' },
];
export const PERIOD_TEXT: Record<string, string> = {
  '7d': 'últimos 7 días',
  '30d': 'últimos 30 días',
  '90d': 'últimos 90 días',
  '6m': 'últimos 6 meses',
  all: 'todo el historial',
};
