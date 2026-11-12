import type {
  Exercise,
  StrengthSet,
  TrainingSession,
} from '../../entities/performance.entity';
import {
  daysBetween,
  mean,
  median,
  pctChange,
  round,
  trendPctPerWeek,
} from './stats';

/**
 * StrengthEngine: progresión y rendimiento de fuerza por ejercicio.
 *
 * Todo es determinista. Lo que sale de aquí son CÁLCULOS sobre lo registrado
 * (volumen, marcas) y ESTIMACIONES (e1RM); cada resultado dice cuál es.
 */

// ------------------------------- e1RM ------------------------------------

/**
 * Por encima de estas repeticiones al fallo no se estima el 1RM: Epley y
 * Brzycki se ajustaron con series cortas y a partir de ~10–12 repeticiones su
 * error crece mucho (la fatiga local pesa más que la fuerza máxima).
 */
export const E1RM_MAX_REPS = 12;
/** Hasta aquí se usa Brzycki; de 11 a 12, Epley. */
const BRZYCKI_MAX_REPS = 10;

export type E1rmFormula = 'ACTUAL' | 'BRZYCKI' | 'EPLEY';

export interface E1rmEstimate {
  /** 1RM estimado en kg. Es una estimación, no una marca. */
  value: number;
  formula: E1rmFormula;
  /** Repeticiones al fallo usadas: las hechas más el RIR declarado. */
  repsToFailure: number;
  /** false si no se apuntó RIR: se asume al fallo y el e1RM queda infraestimado. */
  rirKnown: boolean;
}

/**
 * 1RM estimado de una serie.
 *
 * - 1 repetición al fallo: es la marca real, sin fórmula.
 * - 2–10: Brzycki, `peso × 36 / (37 − reps)`.
 * - 11–12: Epley, `peso × (1 + reps / 30)`.
 * - Más de 12 o sin carga: no se estima (devuelve null).
 *
 * El RIR se suma a las repeticiones (8 reps con RIR 2 ≈ 10 al fallo). Es una
 * aproximación: el RIR declarado tiene su propio error, mayor cuanto más
 * lejos del fallo.
 */
export function estimateE1rm(
  loadKg: number,
  reps: number,
  rir: number | null,
): E1rmEstimate | null {
  if (loadKg <= 0 || reps < 1) return null;
  const repsToFailure = reps + (rir ?? 0);
  if (repsToFailure > E1RM_MAX_REPS) return null;
  const base = { repsToFailure, rirKnown: rir !== null };
  if (repsToFailure === 1) {
    return { value: loadKg, formula: 'ACTUAL', ...base };
  }
  if (repsToFailure <= BRZYCKI_MAX_REPS) {
    return {
      value: (loadKg * 36) / (37 - repsToFailure),
      formula: 'BRZYCKI',
      ...base,
    };
  }
  return {
    value: loadKg * (1 + repsToFailure / 30),
    formula: 'EPLEY',
    ...base,
  };
}

// --------------------------- Puntos por sesión ----------------------------

export interface BestSet {
  weightKg: number;
  reps: number;
  rir: number | null;
  day: string;
  /** e1RM de esa serie, si se puede estimar. */
  e1rm: number | null;
}

/** Lo que se hizo de un ejercicio en una sesión. */
export interface ExerciseSessionPoint {
  sessionId: string;
  day: string;
  /** Series de trabajo (sin calentamiento). */
  workingSets: number;
  totalReps: number;
  /** Σ carga × repeticiones de las series de trabajo, en kg. */
  volumeKg: number;
  /** Carga más alta usada en una serie de trabajo. */
  topWeightKg: number;
  /** Más repeticiones hechas en una serie. */
  maxReps: number;
  avgRepsPerSet: number;
  avgRir: number | null;
  /** Mejor e1RM de la sesión; null si ninguna serie permite estimarlo. */
  e1rm: number | null;
  bestSet: BestSet | null;
}

export interface StrengthOptions {
  /** Día de referencia (`YYYY-MM-DD`), normalmente hoy. */
  today: string;
  /** Peso corporal, para los ejercicios sin carga externa. */
  bodyWeightKg: number | null;
  /** Días del periodo del resumen; null u omitido = todo el historial. */
  periodDays?: number | null;
}

/** Carga real de una serie: en peso corporal, el cuerpo más el lastre. */
export function setLoadKg(
  set: StrengthSet,
  exercise: Exercise | undefined,
  bodyWeightKg: number | null,
): number {
  return exercise?.isBodyweight
    ? set.weightKg + (bodyWeightKg ?? 0)
    : set.weightKg;
}

function pointOf(
  session: TrainingSession,
  sets: StrengthSet[],
  exercise: Exercise | undefined,
  bodyWeightKg: number | null,
): ExerciseSessionPoint | null {
  const working = sets.filter((s) => !s.isWarmup);
  if (!working.length) return null;

  let best: BestSet | null = null;
  for (const s of working) {
    const load = setLoadKg(s, exercise, bodyWeightKg);
    const est = estimateE1rm(load, s.reps, s.rir);
    const candidate: BestSet = {
      weightKg: s.weightKg,
      reps: s.reps,
      rir: s.rir,
      day: session.day,
      e1rm: est ? round(est.value, 1) : null,
    };
    // Mejor serie: la de mayor e1RM; sin e1RM, la de más carga y luego más reps.
    const better =
      !best ||
      (candidate.e1rm ?? -1) > (best.e1rm ?? -1) ||
      (candidate.e1rm === best.e1rm &&
        (candidate.weightKg > best.weightKg ||
          (candidate.weightKg === best.weightKg &&
            candidate.reps > best.reps)));
    if (better) best = candidate;
  }

  const reps = working.map((s) => s.reps);
  const rirs = working.flatMap((s) => (s.rir === null ? [] : [s.rir]));
  const totalReps = reps.reduce((a, b) => a + b, 0);
  const avgRir = mean(rirs);
  return {
    sessionId: session.id,
    day: session.day,
    workingSets: working.length,
    totalReps,
    volumeKg: round(
      working.reduce(
        (v, s) => v + setLoadKg(s, exercise, bodyWeightKg) * s.reps,
        0,
      ),
      1,
    ),
    topWeightKg: Math.max(...working.map((s) => s.weightKg)),
    maxReps: Math.max(...reps),
    avgRepsPerSet: round(totalReps / working.length, 1),
    avgRir: avgRir === null ? null : round(avgRir, 1),
    e1rm: best?.e1rm ?? null,
    bestSet: best,
  };
}

// -------------------------- Estancamiento ---------------------------------

export type StrengthStatus =
  | 'PROGRESSING'
  | 'POTENTIAL_PLATEAU'
  | 'REGRESSION'
  | 'INSUFFICIENT_DATA';

export type StrengthSignal =
  | 'NEW_PERSONAL_RECORD'
  | 'STRENGTH_UP'
  | 'NO_STRENGTH_GAIN'
  | 'STRENGTH_DOWN'
  | 'REPS_UP'
  | 'NO_REP_GAIN'
  | 'VOLUME_UP'
  | 'VOLUME_STALLED'
  | 'VOLUME_DOWN'
  | 'TOO_FEW_SESSIONS'
  | 'TOO_SHORT_SPAN';

/** Ventana que se mira para decidir si hay estancamiento. */
export const PLATEAU_WINDOW_DAYS = 56;
/** Con menos sesiones del ejercicio en la ventana no se clasifica. */
export const PLATEAU_MIN_SESSIONS = 4;
/** Ni si entre la primera y la última hay menos de estos días. */
export const PLATEAU_MIN_SPAN_DAYS = 21;
/** Mejora mínima (%) entre mitades para hablar de progresión. */
const PROGRESS_PCT = 1;
/** Caída mínima (%) entre mitades para hablar de retroceso. */
const REGRESSION_PCT = -2.5;
/** Una marca cuenta como nueva si supera a la anterior en al menos este %. */
const PR_MARGIN_PCT = 0.5;
/** Banda (%) dentro de la cual repeticiones y volumen se consideran estables. */
const STABLE_BAND_PCT = 5;

export interface PlateauEvidence {
  /** Con qué se mide el rendimiento: e1RM o, si no se puede estimar, repeticiones. */
  metric: 'E1RM' | 'MAX_REPS';
  windowDays: number;
  sessions: number;
  spanDays: number;
  /** Mediana de la primera mitad de sesiones de la ventana. */
  baselineMedian: number | null;
  /** Mediana de la segunda mitad. */
  recentMedian: number | null;
  changePct: number | null;
  /** Tendencia lineal en % por semana. */
  trendPctPerWeek: number | null;
  /** Sesiones de la mitad reciente por debajo de la mediana de referencia. */
  recentSessionsBelowBaseline: number;
  /** Días desde la última mejor marca (del histórico completo). */
  daysSinceRecord: number | null;
  repsChangePct: number | null;
  volumeChangePct: number | null;
}

export interface PlateauResult {
  status: StrengthStatus;
  /** Qué ha llevado a la clasificación, en orden de importancia. */
  signals: StrengthSignal[];
  /** Los números con los que se ha decidido. */
  evidence: PlateauEvidence;
}

function halves<T>(items: T[]): [T[], T[]] {
  const cut = Math.floor(items.length / 2);
  return [items.slice(0, cut), items.slice(items.length - cut)];
}

/**
 * Clasifica la evolución de un ejercicio.
 *
 * No compara sesiones sueltas: toma las de las últimas 8 semanas, las parte en
 * dos mitades y compara sus MEDIANAS (una sesión mala no mueve la mediana).
 * Hace falta un mínimo de sesiones y de días para opinar.
 *
 * - REGRESSION: la mediana reciente cae ≥ 2,5 %, la tendencia es negativa y al
 *   menos dos sesiones recientes quedan por debajo de la referencia.
 * - PROGRESSING: la mediana sube ≥ 1 % o hay una marca nueva en la mitad reciente.
 * - POTENTIAL_PLATEAU: nada de lo anterior con datos suficientes.
 */
export function detectPlateau(
  history: ExerciseSessionPoint[],
  today: string,
): PlateauResult {
  const window = history.filter(
    (p) => daysBetween(p.day, today) <= PLATEAU_WINDOW_DAYS,
  );
  const useE1rm =
    window.filter((p) => p.e1rm !== null).length >= window.length / 2;
  const metric: PlateauEvidence['metric'] = useE1rm ? 'E1RM' : 'MAX_REPS';
  const valueOf = (p: ExerciseSessionPoint): number | null =>
    useE1rm ? p.e1rm : p.maxReps;
  const points = window.flatMap((p) => {
    const value = valueOf(p);
    return value === null ? [] : [{ day: p.day, value, point: p }];
  });

  const spanDays = points.length
    ? daysBetween(points[0].day, points[points.length - 1].day)
    : 0;

  // Marca del histórico completo, no solo de la ventana.
  let recordDay: string | null = null;
  let record = -Infinity;
  for (const p of history) {
    const v = valueOf(p);
    if (v !== null && v > record * (1 + PR_MARGIN_PCT / 100)) {
      record = v;
      recordDay = p.day;
    }
  }

  const [base, recent] = halves(points);
  const baselineMedian = median(base.map((p) => p.value));
  const recentMedian = median(recent.map((p) => p.value));
  const changePct = pctChange(baselineMedian, recentMedian);
  const trend = trendPctPerWeek(points);
  const repsChangePct = pctChange(
    mean(base.map((p) => p.point.avgRepsPerSet)),
    mean(recent.map((p) => p.point.avgRepsPerSet)),
  );
  const volumeChangePct = pctChange(
    mean(base.map((p) => p.point.volumeKg)),
    mean(recent.map((p) => p.point.volumeKg)),
  );
  const below =
    baselineMedian === null
      ? 0
      : recent.filter((p) => p.value < baselineMedian).length;

  const evidence: PlateauEvidence = {
    metric,
    windowDays: PLATEAU_WINDOW_DAYS,
    sessions: points.length,
    spanDays,
    baselineMedian: baselineMedian === null ? null : round(baselineMedian, 1),
    recentMedian: recentMedian === null ? null : round(recentMedian, 1),
    changePct: changePct === null ? null : round(changePct, 1),
    trendPctPerWeek: trend === null ? null : round(trend, 2),
    recentSessionsBelowBaseline: below,
    daysSinceRecord: recordDay ? daysBetween(recordDay, today) : null,
    repsChangePct: repsChangePct === null ? null : round(repsChangePct, 1),
    volumeChangePct:
      volumeChangePct === null ? null : round(volumeChangePct, 1),
  };

  if (points.length < PLATEAU_MIN_SESSIONS) {
    return {
      status: 'INSUFFICIENT_DATA',
      signals: ['TOO_FEW_SESSIONS'],
      evidence,
    };
  }
  if (spanDays < PLATEAU_MIN_SPAN_DAYS) {
    return {
      status: 'INSUFFICIENT_DATA',
      signals: ['TOO_SHORT_SPAN'],
      evidence,
    };
  }

  const recordInRecent =
    recordDay !== null && recent.some((p) => p.day === recordDay);
  const secondary: StrengthSignal[] = [];
  if (repsChangePct !== null) {
    secondary.push(repsChangePct > STABLE_BAND_PCT ? 'REPS_UP' : 'NO_REP_GAIN');
  }
  if (volumeChangePct !== null) {
    secondary.push(
      volumeChangePct > STABLE_BAND_PCT
        ? 'VOLUME_UP'
        : volumeChangePct < -STABLE_BAND_PCT
          ? 'VOLUME_DOWN'
          : 'VOLUME_STALLED',
    );
  }

  if (
    changePct !== null &&
    changePct <= REGRESSION_PCT &&
    (trend ?? 0) < 0 &&
    below >= 2 &&
    !recordInRecent
  ) {
    return {
      status: 'REGRESSION',
      signals: ['STRENGTH_DOWN', ...secondary],
      evidence,
    };
  }
  if (recordInRecent || (changePct !== null && changePct >= PROGRESS_PCT)) {
    return {
      status: 'PROGRESSING',
      signals: [
        ...(recordInRecent ? (['NEW_PERSONAL_RECORD'] as const) : []),
        ...(changePct !== null && changePct >= PROGRESS_PCT
          ? (['STRENGTH_UP'] as const)
          : []),
        ...secondary,
      ],
      evidence,
    };
  }
  return {
    status: 'POTENTIAL_PLATEAU',
    signals: ['NO_STRENGTH_GAIN', ...secondary],
    evidence,
  };
}

// ------------------------------ Resumen -----------------------------------

export interface ExerciseAnalysis {
  exerciseId: string;
  name: string;
  /** Una entrada por sesión en la que se hizo, de la más antigua a la más reciente. */
  history: ExerciseSessionPoint[];
  sessions: number;
  lastDay: string | null;
  /** Mejor e1RM del histórico (estimación) y cuándo. */
  bestE1rm: { value: number; day: string } | null;
  /** Mejor serie del histórico. */
  bestSet: BestSet | null;
  /** Carga más alta levantada en una serie de trabajo (dato registrado). */
  heaviestKg: number | null;
  totalVolumeKg: number;
  /** e1RM de la última sesión que lo permite. */
  currentE1rm: number | null;
  /** Proporción de series de trabajo con RIR apuntado (0–1). */
  rirCoverage: number;
  /** Lo hecho en el periodo pedido (el estancamiento usa su propia ventana). */
  period: ExercisePeriod;
  plateau: PlateauResult;
}

export interface ExercisePeriod {
  sessions: number;
  workingSets: number;
  volumeKg: number;
  /** Mejor e1RM dentro del periodo. */
  bestE1rm: number | null;
  /** e1RM de la primera y de la última sesión del periodo que lo permiten. */
  firstE1rm: number | null;
  lastE1rm: number | null;
  /** Cambio (%) entre esas dos. */
  changePct: number | null;
}

export interface StrengthAnalysis {
  /** Días del periodo; null = todo el historial. */
  periodDays: number | null;
  exercises: ExerciseAnalysis[];
  /** Cuántos ejercicios hay en cada estado. */
  summary: Record<StrengthStatus, number>;
}

/**
 * Analiza todos los ejercicios con series en `sessions` (en cualquier orden).
 */
export function analyzeStrength(
  sessions: TrainingSession[],
  exercises: Exercise[],
  options: StrengthOptions,
): StrengthAnalysis {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const histories = new Map<string, ExerciseSessionPoint[]>();
  const rir = new Map<string, { known: number; total: number }>();

  // El historial de cada ejercicio tiene que ir en orden cronológico.
  const ordered = [...sessions].sort(
    (a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
  );
  for (const session of ordered) {
    const perExercise = new Map<string, StrengthSet[]>();
    for (const set of session.sets) {
      perExercise.set(set.exerciseId, [
        ...(perExercise.get(set.exerciseId) ?? []),
        set,
      ]);
    }
    for (const [exerciseId, sets] of perExercise) {
      const point = pointOf(
        session,
        sets,
        byId.get(exerciseId),
        options.bodyWeightKg,
      );
      if (!point) continue;
      histories.set(exerciseId, [...(histories.get(exerciseId) ?? []), point]);
      const cov = rir.get(exerciseId) ?? { known: 0, total: 0 };
      for (const s of sets) {
        if (s.isWarmup) continue;
        cov.total += 1;
        if (s.rir !== null) cov.known += 1;
      }
      rir.set(exerciseId, cov);
    }
  }

  const periodDays = options.periodDays ?? null;
  const summary: Record<StrengthStatus, number> = {
    PROGRESSING: 0,
    POTENTIAL_PLATEAU: 0,
    REGRESSION: 0,
    INSUFFICIENT_DATA: 0,
  };

  const analyses = [...histories.entries()].map(([exerciseId, history]) => {
    let bestE1rm: ExerciseAnalysis['bestE1rm'] = null;
    let bestSet: BestSet | null = null;
    for (const p of history) {
      if (p.e1rm !== null && p.e1rm > (bestE1rm?.value ?? -1)) {
        bestE1rm = { value: p.e1rm, day: p.day };
        bestSet = p.bestSet;
      }
    }
    // Sin e1RM (peso corporal sin peso conocido): la serie con más repeticiones.
    bestSet ??= history.reduce<BestSet | null>(
      (best, p) =>
        p.bestSet && (!best || p.bestSet.reps > best.reps) ? p.bestSet : best,
      null,
    );
    const cov = rir.get(exerciseId) ?? { known: 0, total: 0 };
    const plateau = detectPlateau(history, options.today);
    summary[plateau.status] += 1;
    const withE1rm = history.filter((p) => p.e1rm !== null);
    const inPeriod = history.filter((p) => {
      const age = daysBetween(p.day, options.today);
      return age >= 0 && (periodDays === null || age < periodDays);
    });
    const periodE1rm = inPeriod.flatMap((p) =>
      p.e1rm === null ? [] : [p.e1rm],
    );
    const firstE1rm = periodE1rm[0] ?? null;
    const lastE1rm = periodE1rm[periodE1rm.length - 1] ?? null;
    const periodChange =
      periodE1rm.length > 1 ? pctChange(firstE1rm, lastE1rm) : null;
    return {
      exerciseId,
      name: byId.get(exerciseId)?.name ?? 'Ejercicio',
      history,
      sessions: history.length,
      lastDay: history[history.length - 1]?.day ?? null,
      bestE1rm,
      bestSet,
      heaviestKg: Math.max(...history.map((p) => p.topWeightKg)),
      totalVolumeKg: round(
        history.reduce((v, p) => v + p.volumeKg, 0),
        1,
      ),
      currentE1rm: withE1rm[withE1rm.length - 1]?.e1rm ?? null,
      rirCoverage: cov.total ? round(cov.known / cov.total, 2) : 0,
      period: {
        sessions: inPeriod.length,
        workingSets: inPeriod.reduce((n, p) => n + p.workingSets, 0),
        volumeKg: round(
          inPeriod.reduce((v, p) => v + p.volumeKg, 0),
          1,
        ),
        bestE1rm: periodE1rm.length ? Math.max(...periodE1rm) : null,
        firstE1rm,
        lastE1rm,
        changePct: periodChange === null ? null : round(periodChange, 1),
      },
      plateau,
    } satisfies ExerciseAnalysis;
  });

  // Los más entrenados en el periodo primero: es lo que más le importa al usuario.
  analyses.sort(
    (a, b) =>
      b.period.sessions - a.period.sessions ||
      b.sessions - a.sessions ||
      a.name.localeCompare(b.name),
  );
  return { periodDays, exercises: analyses, summary };
}
