import {
  MUSCLES,
  type Exercise,
  type Muscle,
  type StrengthSet,
  type TrainingSession,
} from '../../entities/performance.entity';
import {
  daysBetween,
  mean,
  pctChange,
  round,
  trendOf,
  type Trend,
} from './stats';
import { setLoadKg } from './strength-engine';

/**
 * MuscleEngine: cuánto trabajo de fuerza ha recibido cada grupo muscular.
 *
 * Mide CARGA DE ENTRENAMIENTO (series, volumen, frecuencia). No mide
 * hipertrofia ni recuperación fisiológica, y no pretende hacerlo: el mapa
 * muscular que alimenta enseña dónde se ha entrenado, no cómo está el músculo.
 */

/** Un músculo cuenta como trabajado «directamente» a partir de este peso. */
const DIRECT_WEIGHT = 1;
/** Una sesión cuenta para la frecuencia si aporta al menos este peso al músculo. */
const SESSION_MIN_WEIGHT = 0.5;
/** Semanas que se comparan para la tendencia: últimas 4 contra las 4 anteriores. */
const TREND_WEEKS = 4;
/** Variación (%) dentro de la cual el volumen se considera estable. */
const TREND_BAND_PCT = 10;
/** Días de historial necesarios para comparar los dos bloques de 4 semanas. */
const MIN_TREND_HISTORY_DAYS = (TREND_WEEKS * 2 - 1) * 7;

/**
 * Cuánto «cuenta» una serie según lo cerca que quedó del fallo y sus
 * repeticiones. Es una HEURÍSTICA para no tratar igual una serie a RIR 1 que
 * una a RIR 6; no es una medida de estímulo.
 *
 * - RIR 0–3: 1 · RIR 4: 0,75 · RIR 5: 0,5 · RIR ≥ 6: 0,25.
 * - Sin RIR apuntado: 1 (no se penaliza lo que no se sabe).
 * - 1–2 repeticiones o más de 30: × 0,5 (muy poco tiempo bajo carga, o carga
 *   demasiado ligera).
 */
export function setStimulus(set: StrengthSet): number {
  if (set.isWarmup) return 0;
  const rir = set.rir;
  const byRir =
    rir === null || rir <= 3 ? 1 : rir === 4 ? 0.75 : rir === 5 ? 0.5 : 0.25;
  const byReps = set.reps <= 2 || set.reps > 30 ? 0.5 : 1;
  return byRir * byReps;
}

export interface MuscleWindow {
  days: number;
  /** Series de trabajo de ejercicios donde el músculo es principal. */
  directSets: number;
  /** Σ del peso del músculo en cada serie (1 / 0,5 / 0,25). */
  weightedSets: number;
  /** Lo anterior corregido por cercanía al fallo y repeticiones (heurística). */
  effectiveSets: number;
  /** Σ carga × repeticiones × peso del músculo, en kg. */
  volumeKg: number;
  /** Sesiones distintas que lo trabajaron como principal o secundario. */
  sessions: number;
}

export interface MuscleAnalysis {
  muscle: Muscle;
  last7: MuscleWindow;
  last30: MuscleWindow;
  last90: MuscleWindow;
  /** Todo el historial recibido. */
  allTime: MuscleWindow;
  /** Sesiones por semana en los últimos 28 días. */
  weeklyFrequency: number;
  /** Series ponderadas por semana, las 12 últimas (la última es la actual). */
  weeklySets: number[];
  /** Media semanal de series ponderadas en las últimas 4 semanas completas. */
  avgWeeklySets: number;
  /** Cambio (%) de volumen semanal: últimas 4 semanas contra las 4 anteriores. */
  volumeChangePct: number | null;
  volumeTrend: Trend;
  /** Carga media por repetición (kg) en sus ejercicios principales: 30 días y los 30 previos. */
  avgLoadKg: number | null;
  loadChangePct: number | null;
  loadTrend: Trend;
  lastTrainedDay: string | null;
  daysSinceLast: number | null;
  /** Mayor parte de las series de los últimos 7 días hecha en una sola sesión (0–1). */
  maxSessionShare7d: number | null;
  /**
   * Carga reciente relativa para el mapa: series efectivas de 7 días frente
   * al máximo entre todos los músculos (0–1). Solo sirve para colorear.
   */
  relativeLoad: number;
}

export interface MuscleAnalysisResult {
  muscles: MuscleAnalysis[];
  /** Proporción de series de trabajo con RIR apuntado (0–1). */
  rirCoverage: number;
  /** Series de ejercicios que no están en el catálogo recibido (no se pueden repartir). */
  unmappedSets: number;
}

interface Contribution {
  day: string;
  sessionId: string;
  muscle: Muscle;
  weight: number;
  stimulus: number;
  volumeKg: number;
  loadKg: number;
  reps: number;
}

function emptyWindow(days: number): MuscleWindow {
  return {
    days,
    directSets: 0,
    weightedSets: 0,
    effectiveSets: 0,
    volumeKg: 0,
    sessions: 0,
  };
}

function windowOf(items: Contribution[], days: number): MuscleWindow {
  const w = emptyWindow(days);
  const sessions = new Set<string>();
  for (const c of items) {
    if (c.weight >= DIRECT_WEIGHT) w.directSets += 1;
    w.weightedSets += c.weight;
    w.effectiveSets += c.weight * c.stimulus;
    w.volumeKg += c.volumeKg * c.weight;
    if (c.weight >= SESSION_MIN_WEIGHT) sessions.add(c.sessionId);
  }
  return {
    days,
    directSets: w.directSets,
    weightedSets: round(w.weightedSets, 2),
    effectiveSets: round(w.effectiveSets, 2),
    volumeKg: round(w.volumeKg, 1),
    sessions: sessions.size,
  };
}

export interface MuscleOptions {
  today: string;
  bodyWeightKg: number | null;
}

/** Analiza el trabajo por grupo muscular a partir de las series registradas. */
export function analyzeMuscles(
  sessions: TrainingSession[],
  exercises: Exercise[],
  options: MuscleOptions,
): MuscleAnalysisResult {
  const { today } = options;
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const contributions: Contribution[] = [];
  let working = 0;
  let withRir = 0;
  let unmapped = 0;

  for (const session of sessions) {
    for (const set of session.sets) {
      if (set.isWarmup) continue;
      working += 1;
      if (set.rir !== null) withRir += 1;
      const exercise = byId.get(set.exerciseId);
      if (!exercise) {
        unmapped += 1;
        continue;
      }
      const loadKg = setLoadKg(set, exercise, options.bodyWeightKg);
      const stimulus = setStimulus(set);
      for (const m of exercise.muscles) {
        contributions.push({
          day: session.day,
          sessionId: session.id,
          muscle: m.muscle,
          weight: m.weight,
          stimulus,
          volumeKg: loadKg * set.reps,
          loadKg,
          reps: set.reps,
        });
      }
    }
  }

  // No se asume ningún orden en `sessions`: se busca el primer día.
  const firstDay = sessions.reduce<string | null>(
    (d, x) => (d === null || x.day < d ? x.day : d),
    null,
  );
  const historyDays = firstDay ? daysBetween(firstDay, today) : 0;

  const within = (items: Contribution[], from: number, to: number) =>
    items.filter((c) => {
      const age = daysBetween(c.day, today);
      return age >= from && age < to;
    });

  const analyses = MUSCLES.map((muscle) => {
    const mine = contributions.filter((c) => c.muscle === muscle);
    const last7 = within(mine, 0, 7);

    // Semanas hacia atrás desde hoy: la 0 son los últimos 7 días.
    const weeklySets = Array.from({ length: 12 }, (_, i) => {
      const week = 11 - i;
      return round(
        within(mine, week * 7, week * 7 + 7).reduce((s, c) => s + c.weight, 0),
        2,
      );
    });
    const weekVolume = (week: number) =>
      within(mine, week * 7, week * 7 + 7).reduce(
        (s, c) => s + c.volumeKg * c.weight,
        0,
      );
    const recentWeeks = Array.from({ length: TREND_WEEKS }, (_, i) =>
      weekVolume(i),
    );
    const prevWeeks = Array.from({ length: TREND_WEEKS }, (_, i) =>
      weekVolume(i + TREND_WEEKS),
    );
    // Solo hay tendencia si hubo trabajo en las dos mitades y el historial
    // cubre el bloque antiguo: con menos, ese bloque está incompleto y
    // cualquier comparación saldría como una subida que no es real.
    const hasBoth =
      historyDays >= MIN_TREND_HISTORY_DAYS &&
      recentWeeks.some((v) => v > 0) &&
      prevWeeks.some((v) => v > 0);
    const volumeChangePct = hasBoth
      ? pctChange(mean(prevWeeks), mean(recentWeeks))
      : null;

    const avgLoad = (items: Contribution[]) => {
      const direct = items.filter(
        (c) => c.weight >= DIRECT_WEIGHT && c.loadKg > 0,
      );
      const reps = direct.reduce((s, c) => s + c.reps, 0);
      return reps ? direct.reduce((s, c) => s + c.volumeKg, 0) / reps : null;
    };
    const loadNow = avgLoad(within(mine, 0, 30));
    const loadChangePct = pctChange(avgLoad(within(mine, 30, 60)), loadNow);

    const lastTrainedDay = mine
      .filter((c) => c.weight >= SESSION_MIN_WEIGHT)
      .reduce<
        string | null
      >((d, c) => (d === null || c.day > d ? c.day : d), null);

    const perSession = new Map<string, number>();
    for (const c of last7) {
      perSession.set(
        c.sessionId,
        (perSession.get(c.sessionId) ?? 0) + c.weight,
      );
    }
    const total7 = [...perSession.values()].reduce((a, b) => a + b, 0);

    return {
      muscle,
      last7: windowOf(last7, 7),
      last30: windowOf(within(mine, 0, 30), 30),
      last90: windowOf(within(mine, 0, 90), 90),
      allTime: windowOf(mine, firstDay ? historyDays + 1 : 0),
      weeklyFrequency: round(windowOf(within(mine, 0, 28), 28).sessions / 4, 2),
      weeklySets,
      avgWeeklySets: round(
        within(mine, 0, 28).reduce((s, c) => s + c.weight, 0) / 4,
        2,
      ),
      volumeChangePct:
        volumeChangePct === null ? null : round(volumeChangePct, 1),
      volumeTrend: trendOf(volumeChangePct, TREND_BAND_PCT),
      avgLoadKg: loadNow === null ? null : round(loadNow, 1),
      loadChangePct: loadChangePct === null ? null : round(loadChangePct, 1),
      loadTrend: trendOf(loadChangePct, 2.5),
      lastTrainedDay,
      daysSinceLast: lastTrainedDay ? daysBetween(lastTrainedDay, today) : null,
      maxSessionShare7d: total7
        ? round(Math.max(...perSession.values()) / total7, 2)
        : null,
      relativeLoad: 0,
    } satisfies MuscleAnalysis;
  });

  const maxLoad = Math.max(0, ...analyses.map((a) => a.last7.effectiveSets));
  return {
    muscles: analyses.map((a) => ({
      ...a,
      relativeLoad: maxLoad ? round(a.last7.effectiveSets / maxLoad, 2) : 0,
    })),
    rirCoverage: working ? round(withRir / working, 2) : 0,
    unmappedSets: unmapped,
  };
}
