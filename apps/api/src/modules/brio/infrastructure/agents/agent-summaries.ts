import type { Progress } from '../../application/use-cases/get-progress.use-case';
import type { RecentHealth } from '../../application/use-cases/garmin.use-cases';

/**
 * Resúmenes compactos de datos de Brío para los agentes de IA: lo justo para
 * razonar, sin volcar cientos de filas (cada token cuesta).
 */

const r1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) =>
  xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;

/** Progreso de un periodo: peso, comida frente al objetivo y entrenos. */
export function summarizeProgress(p: Progress) {
  const weights = p.measurements
    .slice()
    .sort((a, b) => a.measuredOn.localeCompare(b.measuredOn))
    .map((m) => ({ day: m.measuredOn, kg: m.weightKg }));
  const logged = p.logs.filter((l) => l.kcalIn > 0);
  const withTarget = logged.filter((l) => l.kcalTarget);
  const kcalAvg = avg(logged.map((l) => l.kcalIn));
  const targetAvg = avg(withTarget.map((l) => l.kcalTarget!));
  return {
    from: p.from,
    to: p.to,
    weight: weights.length
      ? {
          first: weights[0],
          last: weights[weights.length - 1],
          changeKg: r1(weights[weights.length - 1].kg - weights[0].kg),
          measurements: weights.length,
        }
      : null,
    food: {
      daysLogged: logged.length,
      kcalAvg: kcalAvg === null ? null : Math.round(kcalAvg),
      kcalTargetAvg: targetAvg === null ? null : Math.round(targetAvg),
      proteinAvgG: logged.length
        ? Math.round(avg(logged.map((l) => l.proteinG))!)
        : null,
      daysOverTarget: withTarget.filter((l) => l.kcalIn > l.kcalTarget! * 1.05)
        .length,
    },
    training: {
      daysTrained: p.sessions.length,
      sessions: p.sessions.reduce((s, d) => s + d.sessions, 0),
      minutes: p.sessions.reduce((s, d) => s + d.minutes, 0),
    },
  };
}

/** Salud del reloj: últimas dos semanas y cada señal frente a su media. */
export function summarizeHealth(h: RecentHealth) {
  const hours = (sec: number | null) => (sec === null ? null : r1(sec / 3600));
  return {
    connected: h.days.length > 0,
    days: h.days.map((d) => ({
      day: d.day,
      sleepH: hours(d.sleepSec),
      deepSleepH: hours(d.deepSleepSec),
      sleepScore: d.sleepScore,
      restingHr: d.restingHr,
      hrvMs: d.hrvMs,
      steps: d.steps,
      stressAvg: d.stressAvg,
      bodyBatteryMax: d.bodyBatteryMax,
    })),
    sleep: h.sleep,
    hrv: h.hrv,
    restingHr: h.restingHr,
  };
}
