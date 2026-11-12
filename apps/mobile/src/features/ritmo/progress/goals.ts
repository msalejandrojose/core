import type { Progress, RitmoProfile } from '../api';

export interface WeightGoal {
  start: number;
  current: number;
  target: number;
  /** % del camino recorrido, 0–100. */
  pct: number;
  /** Kg que faltan (siempre positivo). */
  left: number;
  /** kg/semana pedido en el perfil (negativo = bajar). */
  planned: number;
  /** kg/semana real en las últimas 4 semanas, si hay pesadas para saberlo. */
  actual: number | null;
  /** Semanas que faltan al ritmo pedido. */
  weeksLeft: number | null;
  /** "≈ 12 semanas" / "conseguido". */
  etaLabel: string;
}

/**
 * Objetivo de peso a partir del perfil y las pesadas. El punto de partida es
 * la primera pesada del último año; el ritmo real, la pendiente de las últimas
 * cuatro semanas. Sin peso objetivo devuelve null.
 */
export function weightGoal(profile: RitmoProfile, weights: Progress['weights']): WeightGoal | null {
  const target = profile.targetWeightKg;
  const current = profile.currentWeightKg ?? weights[weights.length - 1]?.weightKg ?? null;
  if (target === null || current === null) return null;
  const start = weights[0]?.weightKg ?? current;
  const total = Math.abs(start - target);
  const done = Math.abs(start - current);
  const pct = total === 0 ? 100 : Math.max(0, Math.min(100, Math.round((done / total) * 100)));
  const left = Math.abs(current - target);
  const planned = profile.weeklyWeightChangeKg ?? (target < current ? -0.5 : target > current ? 0.25 : 0);

  const last = weights[weights.length - 1];
  const fourWeeksAgo = last ? weights.find((w) => w.day >= shift(last.day, -28)) : undefined;
  let actual: number | null = null;
  if (last && fourWeeksAgo && fourWeeksAgo.day < last.day) {
    const weeks = (new Date(last.day).getTime() - new Date(fourWeeksAgo.day).getTime()) / (7 * 86_400_000);
    actual = (last.weightKg - fourWeeksAgo.weightKg) / weeks;
  }
  // Margen de 0,05: el ritmo se guarda redondeado a centésimas (4 kg a 0,57
  // kg/sem son 7,02 semanas, y deben leerse como 7, no como 8).
  const weeksLeft = left < 0.05 ? 0 : planned !== 0 ? Math.ceil(left / Math.abs(planned) - 0.05) : null;
  const etaLabel = weeksLeft === 0 ? 'conseguido' : weeksLeft !== null ? `≈ ${weeksLeft} semanas` : 'sin fecha';
  return { start, current, target, pct, left, planned, actual, weeksLeft, etaLabel };
}

function shift(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
