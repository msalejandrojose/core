import type { Progress } from '../api';

export type ProgressDay = Progress['days'][number];

/** Un tramo de la gráfica: una barra o un punto (día, semana o mes). */
export interface Bucket {
  label: string;
  from: string;
  to: string;
}

const WEEKDAY = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const MONTH = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function date(day: string): Date {
  return new Date(`${day}T12:00:00Z`);
}

export function shiftDay(day: string, delta: number): string {
  const d = date(day);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Número de semana ISO 8601 (la semana empieza en lunes). */
export function isoWeek(day: string): number {
  const d = date(day);
  const dow = (d.getUTCDay() + 6) % 7; // lunes = 0
  d.setUTCDate(d.getUTCDate() - dow + 3); // jueves de esa semana
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4, 12));
  const fdow = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - fdow + 3);
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
}

/** Lunes de la semana de un día. */
export function mondayOf(day: string): string {
  const dow = (date(day).getUTCDay() + 6) % 7;
  return shiftDay(day, -dow);
}

/** Los últimos `n` días hasta `today`, uno por barra (L, M, X…). */
export function dayBuckets(today: string, n: number): Bucket[] {
  return Array.from({ length: n }, (_, i) => {
    const day = shiftDay(today, i - n + 1);
    return { label: WEEKDAY[date(day).getUTCDay()], from: day, to: day };
  });
}

/** Las últimas `n` semanas (lunes a domingo) hasta la de `today`: "S45". */
export function weekBuckets(today: string, n: number): Bucket[] {
  const monday = mondayOf(today);
  return Array.from({ length: n }, (_, i) => {
    const from = shiftDay(monday, (i - n + 1) * 7);
    return { label: `S${isoWeek(from)}`, from, to: shiftDay(from, 6) };
  });
}

/** Los últimos `n` meses hasta el de `today`: "Ago", "Sep"… */
export function monthBuckets(today: string, n: number): Bucket[] {
  const t = date(today);
  return Array.from({ length: n }, (_, i) => {
    const first = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - (n - 1 - i), 1, 12));
    const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12));
    return {
      label: MONTH[first.getUTCMonth()],
      from: first.toISOString().slice(0, 10),
      to: last.toISOString().slice(0, 10),
    };
  });
}

export function inBucket(day: string, b: Bucket): boolean {
  return day >= b.from && day <= b.to;
}

/**
 * Media de un valor sobre los días CON registro de un tramo. Un día sin
 * comidas no es "0 kcal": es un día sin datos, y contarlo hundiría la media.
 */
export function avgOf(days: ProgressDay[], b: Bucket, pick: (d: ProgressDay) => number): number | null {
  const own = days.filter((d) => inBucket(d.day, b) && d.mealsLogged > 0);
  if (own.length === 0) return null;
  return own.reduce((s, d) => s + pick(d), 0) / own.length;
}

/** Último peso conocido dentro de un tramo (o null si no hubo pesadas). */
export function lastWeightIn(weights: Progress['weights'], b: Bucket): number | null {
  const own = weights.filter((w) => inBucket(w.day, b));
  return own.length ? own[own.length - 1].weightKg : null;
}
