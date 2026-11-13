import type { PlanLoad } from '../entities/plan.entity';
import type { HealthBaseline } from './garmin';
import type { LoadStatus } from './performance/fatigue-engine';
import { LOAD_EXTRA_KCAL } from './plan';

/**
 * Recuperación: una ESTIMACIÓN orientativa de lo fresco que llegas a la
 * próxima sesión, a partir de datos del reloj (sueño, variabilidad, pulso en
 * reposo) y de la carga de entrenamiento. Es aritmética fija y explicable, no
 * un diagnóstico: cada factor dice cuánto suma o resta.
 */

export type RecoveryLevel = 'GOOD' | 'MODERATE' | 'LOW';

export interface RecoveryInputs {
  sleep: HealthBaseline;
  hrv: HealthBaseline;
  restingHr: HealthBaseline;
  load: {
    status: LoadStatus;
    ratio: number | null;
    weekChangePct: number | null;
  };
  /** Sesiones exigentes (RPE ≥ 8) en los últimos 7 días. */
  demandingLast7: number;
  /** Días seguidos entrenando hasta hoy. */
  streakDays: number;
}

export type FactorKey = 'SLEEP' | 'HRV' | 'RESTING_HR' | 'LOAD';

export interface RecoveryFactor {
  key: FactorKey;
  /** Valor medido (segundos de sueño, ms, lpm) o razón de carga; null si no hay dato. */
  value: number | null;
  /** Diferencia con tu media, en %; en la carga, cambio frente a la semana anterior. */
  deltaPct: number | null;
  /** Puntos que suma o resta a la puntuación. */
  points: number;
  good: boolean;
}

export interface RecoveryScore {
  /** 0–100; null si no hay ningún dato en el que basarse. */
  score: number | null;
  level: RecoveryLevel | null;
  factors: RecoveryFactor[];
  /** El factor que más resta, para explicarlo; null si ninguno resta. */
  limiting: FactorKey | null;
}

const BASE = 72;
const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

function sleepPoints(b: HealthBaseline): number {
  if (b.latest === null) return 0;
  // Frente a tu media, y además un mínimo absoluto: menos de 6 h pesa siempre.
  const relative = b.deltaPct === null ? 0 : clamp(b.deltaPct * 0.6, -14, 6);
  const short = b.latest < 6 * 3600 ? -8 : 0;
  return Math.round(relative + short);
}

const hrvPoints = (b: HealthBaseline) =>
  b.deltaPct === null ? 0 : Math.round(clamp(b.deltaPct * 0.8, -16, 8));

/** Un pulso en reposo más alto que el tuyo habitual resta. */
const restingHrPoints = (b: HealthBaseline) =>
  b.deltaPct === null ? 0 : Math.round(clamp(-b.deltaPct * 1.5, -14, 5));

function loadPoints(i: RecoveryInputs): number {
  const byStatus: Record<LoadStatus, number> = {
    WELL_ABOVE_USUAL: -14,
    ABOVE_USUAL: -8,
    USUAL: 0,
    BELOW_USUAL: 3,
    WELL_BELOW_USUAL: 4,
    INSUFFICIENT_DATA: 0,
  };
  const demanding = i.demandingLast7 >= 3 ? -5 : 0;
  const streak = i.streakDays >= 6 ? -5 : 0;
  return byStatus[i.load.status] + demanding + streak;
}

export function levelOf(score: number): RecoveryLevel {
  return score >= 75 ? 'GOOD' : score >= 55 ? 'MODERATE' : 'LOW';
}

export function recoveryScore(i: RecoveryInputs): RecoveryScore {
  const factors: RecoveryFactor[] = [
    {
      key: 'SLEEP',
      value: i.sleep.latest,
      deltaPct: i.sleep.deltaPct,
      points: sleepPoints(i.sleep),
      good: true,
    },
    {
      key: 'HRV',
      value: i.hrv.latest,
      deltaPct: i.hrv.deltaPct,
      points: hrvPoints(i.hrv),
      good: true,
    },
    {
      key: 'RESTING_HR',
      value: i.restingHr.latest,
      deltaPct: i.restingHr.deltaPct,
      points: restingHrPoints(i.restingHr),
      good: true,
    },
    {
      key: 'LOAD',
      value: i.load.ratio,
      deltaPct: i.load.weekChangePct,
      points: loadPoints(i),
      good: true,
    },
  ].map((f) => ({ ...f, good: f.points >= 0 }) as RecoveryFactor);

  const hasHealth = [i.sleep, i.hrv, i.restingHr].some(
    (b) => b.latest !== null,
  );
  const hasLoad = i.load.status !== 'INSUFFICIENT_DATA';
  if (!hasHealth && !hasLoad)
    return { score: null, level: null, factors, limiting: null };

  const score = Math.round(
    clamp(BASE + factors.reduce((sum, f) => sum + f.points, 0), 5, 100),
  );
  const worst = [...factors].sort((a, b) => a.points - b.points)[0];
  return {
    score,
    level: levelOf(score),
    factors,
    limiting: worst.points < 0 ? worst.key : null,
  };
}

export type RecoveryOptionId = 'KEEP' | 'EASY' | 'MOVE' | 'REST';

export interface TomorrowSession {
  kind: string;
  title: string;
  load: PlanLoad;
}

export interface RecoveryOption {
  id: RecoveryOptionId;
  recommended: boolean;
  /** Plantilla por la que se cambia la sesión (EASY, REST); null en el resto. */
  templateCode: string | null;
  /** Cuánto cambia el objetivo de kcal del día (negativo = menos). */
  kcalDelta: number;
}

/** Sesión suave que sustituye a la planificada, según su tipo. */
export function easyTemplateFor(kind: string): string {
  if (kind === 'RUN') return 'z2';
  if (kind === 'CYCLE') return 'bici';
  return 'mov';
}

const EASY_LOAD: Record<string, PlanLoad> = {
  z2: 'MEDIUM',
  bici: 'LOW',
  mov: 'LOW',
};

/**
 * Qué hacer con la sesión de mañana. Con buena recuperación, o si mañana no
 * hay nada exigente, no se propone cambiar nada. Mover la sesión solo se ofrece
 * si el día siguiente está libre o es suave.
 */
export function recoveryOptions(
  level: RecoveryLevel | null,
  tomorrow: TomorrowSession | null,
  dayAfter: TomorrowSession | null,
): RecoveryOption[] {
  if (!tomorrow || tomorrow.load === 'REST' || tomorrow.load === 'LOW')
    return [];
  const keep = (recommended: boolean): RecoveryOption => ({
    id: 'KEEP',
    recommended,
    templateCode: null,
    kcalDelta: 0,
  });
  if (level === null || level === 'GOOD') return [keep(true)];

  const base = LOAD_EXTRA_KCAL[tomorrow.load];
  const easyCode = easyTemplateFor(tomorrow.kind);
  const easyLoad = EASY_LOAD[easyCode];
  const options: RecoveryOption[] = [];
  // Una sesión ya media no se "suaviza" a otra media.
  if (easyLoad !== tomorrow.load)
    options.push({
      id: 'EASY',
      recommended: false,
      templateCode: easyCode,
      kcalDelta: LOAD_EXTRA_KCAL[easyLoad] - base,
    });
  const freeNext =
    !dayAfter || dayAfter.load === 'REST' || dayAfter.load === 'LOW';
  if (freeNext)
    options.push({
      id: 'MOVE',
      recommended: false,
      templateCode: null,
      kcalDelta: (dayAfter ? LOAD_EXTRA_KCAL[dayAfter.load] : 0) - base,
    });
  if (level === 'LOW')
    options.push({
      id: 'REST',
      recommended: false,
      templateCode: 'rest',
      kcalDelta: -base,
    });
  options.push(keep(false));

  // Con recuperación baja se recomienda descansar; con moderada, suavizar (o mover, si no se puede).
  const pick =
    level === 'LOW'
      ? 'REST'
      : options.some((o) => o.id === 'EASY')
        ? 'EASY'
        : options.some((o) => o.id === 'MOVE')
          ? 'MOVE'
          : 'KEEP';
  return options.map((o) => ({ ...o, recommended: o.id === pick }));
}
