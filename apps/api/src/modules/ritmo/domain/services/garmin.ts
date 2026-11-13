/**
 * Traducción de los datos de Garmin (Connect Personal API) a Ritmo, sin red ni
 * base de datos.
 */

export interface GarminActivity {
  activityId: number;
  activityName?: string | null;
  /** "yyyy-MM-dd HH:mm:ss" en UTC, sin sufijo de zona. */
  startTimeGMT?: string | null;
  activityType?: { typeKey?: string | null } | null;
  distance?: number | null;
  duration?: number | null;
  movingDuration?: number | null;
  elevationGain?: number | null;
  calories?: number | null;
  averageHR?: number | null;
  maxHR?: number | null;
  averageRunningCadenceInStepsPerMinute?: number | null;
  averageBikingCadenceInRevPerMinute?: number | null;
  hrTimeInZone_1?: number | null;
  hrTimeInZone_2?: number | null;
  hrTimeInZone_3?: number | null;
  hrTimeInZone_4?: number | null;
  hrTimeInZone_5?: number | null;
}

export interface GarminDailySummary {
  calendarDate?: string | null;
  movement?: { steps?: { value?: number | null } | number | null } | null;
  heartRate?: { restingValue?: number | null } | null;
  stress?: { avgLevel?: number | null } | null;
  bodyBattery?: { maxValue?: number | null } | null;
}

export interface GarminSleep {
  calendarDate?: string | null;
  sleepTimeSeconds?: number | null;
  deepSleepSeconds?: number | null;
  remSleepSeconds?: number | null;
  awakeSleepSeconds?: number | null;
  sleepScores?: Record<string, { value?: number | null } | null> | null;
}

export interface GarminHrv {
  calendarDate?: string | null;
  lastNightAvg?: number | null;
}

/** Tipo de actividad del catálogo de Ritmo (por `code`) para cada tipo de Garmin. */
const TYPE_CODE: Record<string, string> = {
  running: 'running',
  street_running: 'running',
  track_running: 'running',
  trail_running: 'running',
  treadmill_running: 'running',
  indoor_running: 'running',
  virtual_run: 'running',
  ultra_run: 'running',
  cycling: 'cycling',
  road_biking: 'cycling',
  mountain_biking: 'cycling',
  gravel_cycling: 'cycling',
  indoor_cycling: 'cycling',
  virtual_ride: 'cycling',
  e_bike_fitness: 'cycling',
  walking: 'walking',
  casual_walking: 'walking',
  speed_walking: 'walking',
  hiking: 'hiking',
  swimming: 'swimming',
  lap_swimming: 'swimming',
  open_water_swimming: 'swimming',
  strength_training: 'strength',
  hiit: 'hiit',
  yoga: 'yoga',
  pilates: 'yoga',
  elliptical: 'elliptical',
  rowing: 'rowing',
  indoor_rowing: 'rowing',
  soccer: 'football',
  padel: 'padel',
  paddelball: 'padel',
  basketball: 'basketball',
  dance: 'dancing',
  rock_climbing: 'climbing',
  indoor_climbing: 'climbing',
  bouldering: 'climbing',
};

export const STRENGTH_TYPE_CODE = 'strength';

/** Código del tipo de actividad de Ritmo, o null si Garmin usa uno sin equivalente. */
export function typeCodeFor(activity: GarminActivity): string | null {
  const key = activity.activityType?.typeKey ?? '';
  return TYPE_CODE[key] ?? null;
}

const int = (n: number | null | undefined, min: number, max: number) =>
  n == null || !Number.isFinite(n)
    ? null
    : Math.min(max, Math.max(min, Math.round(n)));

/** "2026-08-31 22:01:18" (UTC) → Date; null si no es una fecha. */
export function parseGmt(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(`${value.trim().replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface ImportedActivity {
  externalId: string;
  startedAt: Date;
  durationSec: number;
  distanceM: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  elevationGainM: number | null;
  cadence: number | null;
  zoneSeconds: number[] | null;
  /** Calorías medidas por el reloj, si las da. */
  kcal: number | null;
  notes: string | null;
}

/** Entreno de Garmin en los campos de una sesión de Ritmo; null si no es utilizable. */
export function activityFrom(a: GarminActivity): ImportedActivity | null {
  const startedAt = parseGmt(a.startTimeGMT);
  const durationSec = int(a.duration ?? a.movingDuration, 1, 24 * 3600);
  if (!startedAt || !durationSec || !a.activityId) return null;
  const zones = [
    a.hrTimeInZone_1,
    a.hrTimeInZone_2,
    a.hrTimeInZone_3,
    a.hrTimeInZone_4,
    a.hrTimeInZone_5,
  ];
  const hasZones = zones.some((z) => (z ?? 0) > 0);
  return {
    externalId: String(a.activityId),
    startedAt,
    durationSec,
    distanceM: a.distance ? int(a.distance, 1, 1_000_000) : null,
    avgHeartRate: int(a.averageHR, 30, 250),
    maxHeartRate: int(a.maxHR, 30, 250),
    elevationGainM: a.elevationGain ? int(a.elevationGain, 0, 20_000) : null,
    cadence: int(
      a.averageRunningCadenceInStepsPerMinute ??
        a.averageBikingCadenceInRevPerMinute,
      1,
      300,
    ),
    zoneSeconds: hasZones ? zones.map((z) => int(z, 0, 86_400) ?? 0) : null,
    kcal: a.calories ? int(a.calories, 1, 20_000) : null,
    notes: a.activityName?.trim().slice(0, 500) || null,
  };
}

export interface DailyHealth {
  day: string;
  restingHr: number | null;
  steps: number | null;
  sleepSec: number | null;
  deepSleepSec: number | null;
  remSleepSec: number | null;
  awakeSec: number | null;
  sleepScore: number | null;
  hrvMs: number | null;
  stressAvg: number | null;
  bodyBatteryMax: number | null;
}

const DAY = /^\d{4}-\d{2}-\d{2}/;
const dayOf = (v: string | null | undefined) =>
  v && DAY.test(v) ? v.slice(0, 10) : null;

const emptyDay = (day: string): DailyHealth => ({
  day,
  restingHr: null,
  steps: null,
  sleepSec: null,
  deepSleepSec: null,
  remSleepSec: null,
  awakeSec: null,
  sleepScore: null,
  hrvMs: null,
  stressAvg: null,
  bodyBatteryMax: null,
});

/**
 * Junta en una fila por día lo que Garmin da en tres consultas distintas
 * (resumen diario, sueño y variabilidad). Los días sin ningún dato se omiten.
 */
export function mergeDailyHealth(
  summaries: GarminDailySummary[],
  sleeps: GarminSleep[],
  hrv: GarminHrv[],
): DailyHealth[] {
  const days = new Map<string, DailyHealth>();
  const at = (day: string) => {
    if (!days.has(day)) days.set(day, emptyDay(day));
    return days.get(day)!;
  };
  for (const s of summaries) {
    const day = dayOf(s.calendarDate);
    if (!day) continue;
    const steps = s.movement?.steps;
    const d = at(day);
    d.restingHr = int(s.heartRate?.restingValue, 25, 150);
    d.steps = int(typeof steps === 'number' ? steps : steps?.value, 0, 200_000);
    d.stressAvg = int(s.stress?.avgLevel, 0, 100);
    d.bodyBatteryMax = int(s.bodyBattery?.maxValue, 0, 100);
  }
  for (const s of sleeps) {
    const day = dayOf(s.calendarDate);
    if (!day) continue;
    const d = at(day);
    d.sleepSec = s.sleepTimeSeconds ? int(s.sleepTimeSeconds, 1, 86_400) : null;
    d.deepSleepSec = int(s.deepSleepSeconds, 0, 86_400);
    d.remSleepSec = int(s.remSleepSeconds, 0, 86_400);
    d.awakeSec = int(s.awakeSleepSeconds, 0, 86_400);
    d.sleepScore = int(s.sleepScores?.overall?.value, 0, 100);
  }
  for (const h of hrv) {
    const day = dayOf(h.calendarDate);
    if (!day) continue;
    at(day).hrvMs = h.lastNightAvg ? int(h.lastNightAvg, 1, 300) : null;
  }
  return [...days.values()]
    .filter((d) =>
      Object.entries(d).some(([k, v]) => k !== 'day' && v !== null),
    )
    .sort((a, b) => a.day.localeCompare(b.day));
}

/** Parte un rango de días en tramos de como mucho `size` días (ambos extremos incluidos). */
export function dayRanges(
  from: string,
  to: string,
  size: number,
): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  const end = Date.parse(`${to}T00:00:00Z`);
  let cursor = Date.parse(`${from}T00:00:00Z`);
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  while (cursor <= end) {
    const stop = Math.min(end, cursor + (size - 1) * 86_400_000);
    out.push({ from: iso(cursor), to: iso(stop) });
    cursor = stop + 86_400_000;
  }
  return out;
}

export interface HealthBaseline {
  /** Último valor disponible. */
  latest: number | null;
  /** Media de los días anteriores (hasta 28). */
  baseline: number | null;
  /** Diferencia en % entre el último valor y la media; null si falta alguno. */
  deltaPct: number | null;
}

/** Último valor de una métrica frente a su media reciente. */
export function againstBaseline(
  days: DailyHealth[],
  pick: (d: DailyHealth) => number | null,
): HealthBaseline & { day: string | null } {
  const withValue = days.filter((d) => pick(d) !== null);
  const last = withValue[withValue.length - 1];
  if (!last) return { latest: null, baseline: null, deltaPct: null, day: null };
  const previous = withValue.slice(0, -1).slice(-28);
  const latest = pick(last)!;
  if (previous.length < 3)
    return { latest, baseline: null, deltaPct: null, day: last.day };
  const baseline =
    previous.reduce((sum, d) => sum + pick(d)!, 0) / previous.length;
  return {
    latest,
    baseline: Math.round(baseline * 10) / 10,
    deltaPct: baseline
      ? Math.round(((latest - baseline) / baseline) * 100)
      : null,
    day: last.day,
  };
}
