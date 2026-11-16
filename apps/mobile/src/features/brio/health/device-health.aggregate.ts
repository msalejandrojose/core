/**
 * Agrupa por día local lo que devuelve Apple Salud / Health Connect, en el
 * formato que espera `POST /brio/health/device/sync`. Puro: sin plugin ni red,
 * para poder probarlo.
 */

export interface RawSample {
  value: number;
  startDate: string;
  endDate: string;
  sourceId?: string;
  sourceName?: string;
  sleepState?: 'inBed' | 'asleep' | 'awake' | 'rem' | 'deep' | 'light';
  stages?: { startDate: string; endDate: string; stage: RawSample['sleepState'] & string; durationMinutes: number }[];
}

export interface RawBucket {
  startDate: string;
  value: number;
}

export interface RawWorkout {
  workoutType: string;
  duration: number;
  totalEnergyBurned?: number;
  totalDistance?: number;
  startDate: string;
  endDate: string;
  sourceName?: string;
  sourceId?: string;
  platformId?: string;
}

export interface DeviceDay {
  day: string;
  steps?: number;
  restingHr?: number;
  hrvMs?: number;
  sleepSec?: number;
  deepSleepSec?: number;
  remSleepSec?: number;
  awakeSec?: number;
  weightKg?: number;
}

export interface DeviceWorkout {
  id: string;
  workoutType: string;
  startDate: string;
  endDate: string;
  durationSec: number;
  kcal?: number;
  distanceM?: number;
  sourceName?: string;
  sourceId?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Día local (YYYY-MM-DD) de una fecha ISO, en la zona horaria del teléfono. */
export function localDay(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const seconds = (start: string, end: string) => Math.max(0, (Date.parse(end) - Date.parse(start)) / 1000);

function average(samples: RawSample[]): Map<string, number> {
  const acc = new Map<string, { sum: number; n: number }>();
  for (const s of samples) {
    if (!Number.isFinite(s.value)) continue;
    const day = localDay(s.startDate);
    const a = acc.get(day) ?? { sum: 0, n: 0 };
    a.sum += s.value;
    a.n += 1;
    acc.set(day, a);
  }
  return new Map([...acc].map(([day, a]) => [day, Math.round(a.sum / a.n)]));
}

interface Night {
  sleep: number;
  deep: number;
  rem: number;
  awake: number;
  inBed: number;
}

/**
 * Sueño por noche, imputado al día en que te despiertas. Si dos apps (p. ej.
 * Apple Watch y Garmin) escriben la misma noche, se queda la que más sueño
 * registra en vez de sumarlas.
 */
export function sleepByDay(samples: RawSample[]): Map<string, Omit<DeviceDay, 'day'>> {
  const bySource = new Map<string, Night>();
  const add = (day: string, source: string, stage: string | undefined, sec: number) => {
    const key = `${day}|${source}`;
    const n = bySource.get(key) ?? { sleep: 0, deep: 0, rem: 0, awake: 0, inBed: 0 };
    if (stage === 'awake') n.awake += sec;
    else if (stage === 'inBed') n.inBed += sec;
    else {
      n.sleep += sec;
      if (stage === 'deep') n.deep += sec;
      if (stage === 'rem') n.rem += sec;
    }
    bySource.set(key, n);
  };
  for (const s of samples) {
    const day = localDay(s.endDate);
    const source = s.sourceId ?? s.sourceName ?? '';
    if (s.stages?.length) {
      for (const st of s.stages) add(day, source, st.stage, st.durationMinutes * 60 || seconds(st.startDate, st.endDate));
    } else {
      add(day, source, s.sleepState ?? 'asleep', seconds(s.startDate, s.endDate));
    }
  }
  const best = new Map<string, Night>();
  for (const [key, n] of bySource) {
    const day = key.split('|')[0];
    const total = n.sleep || n.inBed;
    const current = best.get(day);
    if (!current || total > (current.sleep || current.inBed)) best.set(day, n);
  }
  const out = new Map<string, Omit<DeviceDay, 'day'>>();
  for (const [day, n] of best) {
    // Solo «en cama» (sin fases): es lo único que hay, mejor eso que nada.
    const sleep = n.sleep || n.inBed;
    if (sleep < 30 * 60) continue;
    out.set(day, {
      sleepSec: Math.round(sleep),
      ...(n.deep ? { deepSleepSec: Math.round(n.deep) } : {}),
      ...(n.rem ? { remSleepSec: Math.round(n.rem) } : {}),
      ...(n.awake ? { awakeSec: Math.round(n.awake) } : {}),
    });
  }
  return out;
}

/** Último peso de cada día. */
export function weightByDay(samples: RawSample[]): Map<string, number> {
  const out = new Map<string, { at: number; kg: number }>();
  for (const s of samples) {
    const day = localDay(s.startDate);
    const at = Date.parse(s.startDate);
    const prev = out.get(day);
    if (!prev || at > prev.at) out.set(day, { at, kg: s.value });
  }
  return new Map([...out].map(([day, w]) => [day, Math.round(w.kg * 10) / 10]));
}

export function buildDays(input: {
  steps: RawBucket[];
  restingHr: RawSample[];
  hrv: RawSample[];
  sleep: RawSample[];
  weight: RawSample[];
}): DeviceDay[] {
  const days = new Map<string, DeviceDay>();
  const at = (day: string) => {
    const d = days.get(day) ?? { day };
    days.set(day, d);
    return d;
  };
  for (const b of input.steps) if (b.value > 0) at(localDay(b.startDate)).steps = Math.round(b.value);
  for (const [day, v] of average(input.restingHr)) at(day).restingHr = v;
  for (const [day, v] of average(input.hrv)) at(day).hrvMs = v;
  for (const [day, v] of sleepByDay(input.sleep)) Object.assign(at(day), v);
  for (const [day, v] of weightByDay(input.weight)) at(day).weightKg = v;
  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export function toWorkouts(raw: RawWorkout[]): DeviceWorkout[] {
  return raw
    .filter((w) => w.duration >= 60)
    .map((w) => ({
      id: w.platformId ?? `${w.sourceId ?? 'device'}:${w.startDate}`,
      workoutType: w.workoutType,
      startDate: w.startDate,
      endDate: w.endDate,
      durationSec: Math.round(w.duration),
      ...(w.totalEnergyBurned ? { kcal: Math.round(w.totalEnergyBurned) } : {}),
      ...(w.totalDistance ? { distanceM: Math.round(w.totalDistance) } : {}),
      ...(w.sourceName ? { sourceName: w.sourceName } : {}),
      ...(w.sourceId ? { sourceId: w.sourceId } : {}),
    }));
}
