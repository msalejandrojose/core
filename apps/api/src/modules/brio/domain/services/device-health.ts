import type { DailyHealth } from './garmin';

/**
 * Salud que lee la app del móvil de Apple Salud (iOS) o Health Connect
 * (Android) y manda ya agrupada por día local. Aquí solo se valida y se
 * traduce a los campos de Brío; el móvil hace la lectura.
 */

export type DevicePlatform = 'ios' | 'android';

/** Un día tal y como lo manda el móvil. Todo es opcional: cada reloj mide cosas distintas. */
export interface DeviceDayInput {
  day: string;
  steps?: number | null;
  restingHr?: number | null;
  hrvMs?: number | null;
  sleepSec?: number | null;
  deepSleepSec?: number | null;
  remSleepSec?: number | null;
  awakeSec?: number | null;
  weightKg?: number | null;
}

/** Un entreno de Salud / Health Connect. */
export interface DeviceWorkoutInput {
  /** UUID de HealthKit o id de Health Connect. */
  id: string;
  workoutType: string;
  startDate: string;
  endDate: string;
  durationSec: number;
  kcal?: number | null;
  distanceM?: number | null;
  /** App que lo grabó (p. ej. «Connect», «Entrenamiento», «Strava»). */
  sourceName?: string | null;
  sourceId?: string | null;
}

export interface DeviceWorkout {
  externalId: string;
  typeCode: string | null;
  startedAt: Date;
  endedAt: Date;
  durationSec: number;
  kcal: number | null;
  distanceM: number | null;
  sourceName: string | null;
  sourceId: string | null;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

const int = (n: number | null | undefined, min: number, max: number) =>
  n == null || !Number.isFinite(n) || n < min || n > max ? null : Math.round(n);

/** Tipo de actividad de Brío (por `code`) para cada tipo de Salud / Health Connect. */
const TYPE_CODE: Record<string, string> = {
  running: 'running',
  runningTreadmill: 'running',
  trackAndField: 'running',
  wheelchairRunPace: 'running',
  cycling: 'cycling',
  bikingStationary: 'cycling',
  handCycling: 'cycling',
  walking: 'walking',
  wheelchairWalkPace: 'walking',
  hiking: 'hiking',
  snowshoeing: 'hiking',
  swimming: 'swimming',
  swimmingPool: 'swimming',
  swimmingOpenWater: 'swimming',
  strengthTraining: 'strength',
  traditionalStrengthTraining: 'strength',
  functionalStrengthTraining: 'strength',
  weightlifting: 'strength',
  calisthenics: 'strength',
  coreTraining: 'strength',
  highIntensityIntervalTraining: 'hiit',
  crossTraining: 'hiit',
  bootCamp: 'hiit',
  mixedCardio: 'hiit',
  yoga: 'yoga',
  pilates: 'yoga',
  mindAndBody: 'yoga',
  flexibility: 'yoga',
  stretching: 'yoga',
  elliptical: 'elliptical',
  rowing: 'rowing',
  rowingMachine: 'rowing',
  soccer: 'football',
  paddleSports: 'padel',
  pickleball: 'padel',
  tennis: 'tennis',
  squash: 'squash',
  badminton: 'badminton',
  tableTennis: 'table_tennis',
  racquetball: 'fronton',
  volleyball: 'volleyball',
  handball: 'handball',
  rugby: 'rugby',
  hockey: 'hockey',
  boxing: 'boxing',
  kickboxing: 'boxing',
  martialArts: 'martial_arts',
  basketball: 'basketball',
  golf: 'golf',
  surfingSports: 'surf',
  paddling: 'kayak',
  downhillSkiing: 'skiing',
  crossCountrySkiing: 'cross_country_skiing',
  snowboarding: 'snowboard',
  skatingSports: 'skating',
  equestrianSports: 'horse_riding',
  socialDance: 'dancing',
  cardioDance: 'dancing',
  climbing: 'climbing',
};

export const deviceTypeCode = (workoutType: string): string | null =>
  TYPE_CODE[workoutType] ?? null;

const date = (v: string): Date | null => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Día del móvil en los campos de salud de Brío; null si el día no es válido. */
export function deviceDayFrom(d: DeviceDayInput): DailyHealth | null {
  if (!DAY.test(d.day)) return null;
  return {
    day: d.day,
    steps: int(d.steps, 0, 200_000),
    restingHr: int(d.restingHr, 20, 200),
    hrvMs: int(d.hrvMs, 1, 400),
    sleepSec: int(d.sleepSec, 0, 24 * 3600),
    deepSleepSec: int(d.deepSleepSec, 0, 24 * 3600),
    remSleepSec: int(d.remSleepSec, 0, 24 * 3600),
    awakeSec: int(d.awakeSec, 0, 24 * 3600),
    // Ni Salud ni Health Connect dan puntuación de sueño, estrés o body battery.
    sleepScore: null,
    stressAvg: null,
    bodyBatteryMax: null,
  };
}

/** Peso del día (kg, con un decimal) o null si no hay o no es creíble. */
export function deviceWeight(d: DeviceDayInput): number | null {
  const w = d.weightKg;
  if (w == null || !Number.isFinite(w) || w < 25 || w > 350) return null;
  return Math.round(w * 10) / 10;
}

/** Entreno del móvil listo para guardar; null si no es utilizable. */
export function deviceWorkoutFrom(w: DeviceWorkoutInput): DeviceWorkout | null {
  const startedAt = date(w.startDate);
  const endedAt = date(w.endDate);
  const durationSec = int(w.durationSec, 60, 24 * 3600);
  if (!startedAt || !endedAt || !durationSec || !w.id?.trim()) return null;
  return {
    externalId: w.id.trim().slice(0, 191),
    typeCode: deviceTypeCode(w.workoutType),
    startedAt,
    endedAt,
    durationSec,
    kcal: int(w.kcal, 0, 10_000),
    distanceM: int(w.distanceM, 0, 1_000_000),
    sourceName: w.sourceName?.trim() || null,
    sourceId: w.sourceId?.trim() || null,
  };
}

/** El entreno lo grabó la app de Garmin (que vuelca en Salud lo mismo que ya trae su conexión). */
export const isFromGarmin = (w: DeviceWorkout): boolean =>
  /garmin/i.test(`${w.sourceId ?? ''} ${w.sourceName ?? ''}`);

/** Dos entrenos se solapan si comparten al menos la mitad del más corto. */
export function overlaps(
  a: { startedAt: Date; durationSec: number },
  b: { startedAt: Date; durationSec: number },
): boolean {
  const aStart = a.startedAt.getTime();
  const bStart = b.startedAt.getTime();
  const aEnd = aStart + a.durationSec * 1000;
  const bEnd = bStart + b.durationSec * 1000;
  const shared = Math.min(aEnd, bEnd) - Math.max(aStart, bStart);
  const shorter = Math.min(a.durationSec, b.durationSec) * 1000;
  return shared > 0 && shared >= shorter / 2;
}

/**
 * Mezcla un día del móvil con el que ya había. Si el que había es de Garmin,
 * solo se rellenan los huecos: Garmin da más detalle (puntuación de sueño,
 * estrés) y su dato manda.
 */
export function mergeDeviceDay(
  incoming: DailyHealth,
  existing: (DailyHealth & { fromGarmin: boolean }) | null,
): Partial<DailyHealth> {
  const out: Partial<DailyHealth> = {};
  for (const [key, value] of Object.entries(incoming) as [
    keyof DailyHealth,
    DailyHealth[keyof DailyHealth],
  ][]) {
    if (key === 'day' || value === null) continue;
    if (existing?.fromGarmin && existing[key] !== null) continue;
    (out as Record<string, unknown>)[key] = value;
  }
  return out;
}
