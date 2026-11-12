// Utilidades estadísticas y de calendario de los motores de rendimiento.
// Funciones puras, sin dependencias: todo es determinista y testeable.

const DAY_MS = 86_400_000;

/** Días naturales entre dos `YYYY-MM-DD` (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);
}

/** `day` desplazado `delta` días. */
export function addDays(day: string, delta: number): string {
  return new Date(Date.parse(day) + delta * DAY_MS).toISOString().slice(0, 10);
}

export function sum(values: number[]): number {
  return values.reduce((s, v) => s + v, 0);
}

export function mean(values: number[]): number | null {
  return values.length ? sum(values) / values.length : null;
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Cambio relativo en % de `from` a `to`. Nulo si no hay base con la que comparar. */
export function pctChange(
  from: number | null,
  to: number | null,
): number | null {
  if (from === null || to === null || from === 0) return null;
  return ((to - from) / Math.abs(from)) * 100;
}

export function round(value: number, decimals = 1): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

/**
 * Pendiente de la recta de mínimos cuadrados sobre puntos (x, y). Nula con
 * menos de dos puntos o si todos comparten la misma x.
 */
export function slope(points: { x: number; y: number }[]): number | null {
  if (points.length < 2) return null;
  const mx = sum(points.map((p) => p.x)) / points.length;
  const my = sum(points.map((p) => p.y)) / points.length;
  const den = sum(points.map((p) => (p.x - mx) ** 2));
  if (den === 0) return null;
  return sum(points.map((p) => (p.x - mx) * (p.y - my))) / den;
}

/**
 * Tendencia de una serie fechada, en % por semana respecto a su media. Así se
 * pueden comparar tendencias de magnitudes distintas (kg, ritmo, series).
 */
export function trendPctPerWeek(
  points: { day: string; value: number }[],
): number | null {
  if (points.length < 2) return null;
  const first = points[0].day;
  const s = slope(
    points.map((p) => ({ x: daysBetween(first, p.day), y: p.value })),
  );
  const avg = mean(points.map((p) => p.value));
  if (s === null || !avg) return null;
  return ((s * 7) / avg) * 100;
}

/**
 * Media móvil exponencial sobre una serie diaria. `span` es el número de días
 * de la ventana equivalente: λ = 2 / (span + 1).
 */
export function ewma(values: number[], span: number): number[] {
  const lambda = 2 / (span + 1);
  const out: number[] = [];
  values.forEach((v, i) => {
    out.push(i === 0 ? v : v * lambda + out[i - 1] * (1 - lambda));
  });
  return out;
}

export type Trend = 'UP' | 'STABLE' | 'DOWN' | 'INSUFFICIENT_DATA';

/** Clasifica un cambio en % con una banda muerta: dentro de ±`band` es estable. */
export function trendOf(changePct: number | null, band: number): Trend {
  if (changePct === null) return 'INSUFFICIENT_DATA';
  if (changePct > band) return 'UP';
  if (changePct < -band) return 'DOWN';
  return 'STABLE';
}

/** Desviación típica poblacional. */
export function stdDev(values: number[]): number | null {
  const m = mean(values);
  if (m === null) return null;
  return Math.sqrt(sum(values.map((v) => (v - m) ** 2)) / values.length);
}

/** Correlación de Pearson; nula con menos de 3 pares o sin variación. */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = Math.min(xs.length, ys.length);
  if (n < 3) return null;
  const mx = sum(xs.slice(0, n)) / n;
  const my = sum(ys.slice(0, n)) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i += 1) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx === 0 || dy === 0 ? null : num / Math.sqrt(dx * dy);
}
