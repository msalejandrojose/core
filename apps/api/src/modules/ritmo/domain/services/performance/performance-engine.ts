import {
  MUSCLES,
  type ActivityKind,
  type Exercise,
  type HeartConfig,
  type Muscle,
  type PerformanceMeasurement,
  type TrainingSession,
} from '../../entities/performance.entity';
import { analyzeCardio, isCardio, type CardioAnalysis } from './cardio-engine';
import {
  analyzeFatigue,
  sessionRpe,
  type FatigueAnalysis,
  type Sex,
} from './fatigue-engine';
import { analyzeHybrid, type HybridAnalysis } from './hybrid-engine';
import { analyzeMuscles, type MuscleAnalysisResult } from './muscle-engine';
import { periodDays, type PerformancePeriod } from './periods';
import { addDays, daysBetween, round, sum } from './stats';
import {
  analyzeStrength,
  setLoadKg,
  type StrengthAnalysis,
  type StrengthStatus,
} from './strength-engine';

/**
 * PerformanceEngine: consolida los cinco motores en un resumen por periodo.
 *
 * No calcula nada nuevo sobre el entrenamiento: ordena lo que dicen los
 * motores. Los índices 0–100 que añade son una ayuda de lectura; cada uno
 * lleva su fórmula y los datos de los que sale, y nunca sustituyen a las
 * métricas originales, que van al lado.
 */

/** Datos de entrada: los mismos para todos los motores. */
export interface PerformanceInput {
  sessions: TrainingSession[];
  exercises: Exercise[];
  heartConfig: HeartConfig | null;
  measurements: PerformanceMeasurement[];
  bodyWeightKg: number | null;
  sex: Sex;
  today: string;
  now: Date;
}

/** Resultado de los cinco motores sobre una misma foto del historial. */
export interface EngineResults {
  strength: StrengthAnalysis;
  muscles: MuscleAnalysisResult;
  cardio: CardioAnalysis;
  fatigue: FatigueAnalysis;
  hybrid: HybridAnalysis;
}

/** Ejecuta los cinco motores una sola vez. */
export function runEngines(
  input: PerformanceInput,
  period: PerformancePeriod,
): EngineResults {
  const { sessions, exercises, today, bodyWeightKg } = input;
  const strength = analyzeStrength(sessions, exercises, {
    today,
    bodyWeightKg,
  });
  const muscles = analyzeMuscles(sessions, exercises, { today, bodyWeightKg });
  const cardio = analyzeCardio(
    sessions,
    input.heartConfig,
    input.measurements,
    {
      today,
      periodDays: periodDays(period),
    },
  );
  const fatigue = analyzeFatigue(sessions, input.heartConfig, muscles, {
    today,
    now: input.now,
    sex: input.sex,
  });
  const hybrid = analyzeHybrid(
    sessions,
    exercises,
    strength,
    cardio.plateaus,
    today,
  );
  return { strength, muscles, cardio, fatigue, hybrid };
}

// -------------------------------- Índices ---------------------------------

export interface PerformanceIndex {
  /** 0–100; null si no hay datos para calcularlo. */
  value: number | null;
  /** Cómo se calcula, para enseñarlo en la app. */
  formula: string;
  /** Las cifras originales de las que sale. */
  inputs: Record<string, number | string | null>;
}

const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

// ------------------------------- Resumen ----------------------------------

export type DataLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface PerformanceSummary {
  period: PerformancePeriod;
  /** Primer y último día del periodo. `from` es null en el histórico completo. */
  from: string | null;
  to: string;
  /** Lo registrado en el periodo. */
  totals: {
    sessions: number;
    strengthSessions: number;
    cardioSessions: number;
    otherSessions: number;
    durationSec: number;
    activeDays: number;
    /** Volumen de fuerza (Σ carga × repeticiones) en kg. */
    strengthVolumeKg: number;
    workingSets: number;
    cardioDistanceM: number;
  };
  strength: {
    trend: HybridAnalysis['evolution']['strength']['trend'];
    changePct: number | null;
    byStatus: Record<StrengthStatus, number>;
    /** Ejercicios con marca nueva en el periodo. */
    records: { exerciseId: string; name: string; e1rm: number; day: string }[];
  };
  cardio: {
    trend: HybridAnalysis['evolution']['cardio']['trend'];
    changePct: number | null;
    kind: ActivityKind | null;
    byKind: CardioAnalysis['byKind'];
  };
  load: {
    recent: number;
    usual: number;
    ratio: number | null;
    status: FatigueAnalysis['load']['status'];
    demandingLast7: number;
    recovery: FatigueAnalysis['estimatedRecovery']['status'];
  };
  /** Reparto del trabajo de fuerza del periodo entre músculos. */
  muscleDistribution: {
    muscle: Muscle;
    weightedSets: number;
    /** Parte del total de series ponderadas (0–1). */
    share: number;
  }[];
  /** Estancamientos y retrocesos detectados, de fuerza y de cardio. */
  plateaus: {
    discipline: 'STRENGTH' | 'CARDIO';
    /** Id del ejercicio o disciplina de cardio. */
    subject: string;
    name: string;
    status: 'POTENTIAL_PLATEAU' | 'REGRESSION';
    changePct: number | null;
    sessions: number;
  }[];
  hybrid: {
    verdict: HybridAnalysis['evolution']['verdict'];
    strengthTimeShare: number | null;
    strengthLoadShare: number | null;
    flags: HybridAnalysis['balance']['flags'];
  };
  indices: {
    consistency: PerformanceIndex;
    strengthProgress: PerformanceIndex;
    cardioProgress: PerformanceIndex;
    loadBalance: PerformanceIndex;
  };
  dataQuality: {
    level: DataLevel;
    historyDays: number;
    sessions: number;
    /** Series de trabajo con RIR apuntado (0–1). */
    rirCoverage: number;
    /** Sesiones con RPE apuntado (0–1). */
    rpeCoverage: number;
    /** Sesiones de cardio con FC media (0–1). */
    heartRateCoverage: number;
    hasHeartConfig: boolean;
    /** Qué falta para que los análisis sean más completos. */
    missing: string[];
  };
}

const CARDIO_KIND_NAME: Record<string, string> = {
  RUN: 'Carrera',
  CYCLE: 'Bicicleta',
  WALK: 'Caminar',
  HIKE: 'Senderismo',
  SWIM: 'Natación',
  ELLIPTICAL: 'Elíptica',
  OTHER_CARDIO: 'Otro cardio',
};

export function cardioKindName(kind: string): string {
  return CARDIO_KIND_NAME[kind] ?? kind;
}

/** Resumen de rendimiento del periodo a partir de los resultados de los motores. */
export function summarize(
  input: PerformanceInput,
  engines: EngineResults,
  period: PerformancePeriod,
): PerformanceSummary {
  const { today } = input;
  const days = periodDays(period);
  const from = days === null ? null : addDays(today, -(days - 1));
  const inPeriod = input.sessions.filter((s) => {
    const age = daysBetween(s.day, today);
    return age >= 0 && (days === null || age < days);
  });
  const byId = new Map(input.exercises.map((e) => [e.id, e]));

  // Volumen y reparto muscular del periodo, directamente de las series.
  let volume = 0;
  let workingSets = 0;
  const muscleSets = new Map<Muscle, number>();
  for (const s of inPeriod) {
    for (const set of s.sets) {
      if (set.isWarmup) continue;
      workingSets += 1;
      const ex = byId.get(set.exerciseId);
      volume += setLoadKg(set, ex, input.bodyWeightKg) * set.reps;
      for (const m of ex?.muscles ?? []) {
        muscleSets.set(m.muscle, (muscleSets.get(m.muscle) ?? 0) + m.weight);
      }
    }
  }
  const totalMuscleSets = sum([...muscleSets.values()]);
  const strengthSessions = inPeriod.filter((s) => s.kind === 'STRENGTH');
  const cardioSessions = inPeriod.filter((s) => isCardio(s.kind));

  const { strength, cardio, fatigue, hybrid, muscles } = engines;
  const evo = hybrid.evolution;

  const plateaus: PerformanceSummary['plateaus'] = [
    ...strength.exercises.flatMap((e) =>
      e.plateau.status === 'POTENTIAL_PLATEAU' ||
      e.plateau.status === 'REGRESSION'
        ? [
            {
              discipline: 'STRENGTH' as const,
              subject: e.exerciseId,
              name: e.name,
              status: e.plateau.status,
              changePct: e.plateau.evidence.changePct,
              sessions: e.plateau.evidence.sessions,
            },
          ]
        : [],
    ),
    ...cardio.plateaus.flatMap((p) =>
      p.status === 'POTENTIAL_PLATEAU' || p.status === 'REGRESSION'
        ? [
            {
              discipline: 'CARDIO' as const,
              subject: p.kind,
              name: cardioKindName(p.kind),
              status: p.status,
              changePct: p.evidence.changePct,
              sessions: p.evidence.sessions,
            },
          ]
        : [],
    ),
  ];

  // --- Índices ---
  const historyDays = fatigue.dataQuality.historyDays;
  const spanDays =
    days === null ? historyDays : Math.min(days, Math.max(historyDays, 1));
  const weeks = Math.max(1, Math.ceil(spanDays / 7));
  const activeWeeks = new Set(
    inPeriod.map((s) => Math.floor(daysBetween(s.day, today) / 7)),
  ).size;
  const judged =
    strength.summary.PROGRESSING +
    strength.summary.POTENTIAL_PLATEAU +
    strength.summary.REGRESSION;
  const ratio = fatigue.load.ratio;

  const indices: PerformanceSummary['indices'] = {
    consistency: {
      value: inPeriod.length ? Math.round((activeWeeks / weeks) * 100) : null,
      formula:
        'Semanas del periodo con al menos un entreno ÷ semanas del periodo × 100.',
      inputs: { activeWeeks, weeks },
    },
    strengthProgress: {
      value: judged
        ? Math.round((strength.summary.PROGRESSING / judged) * 100)
        : null,
      formula:
        'Ejercicios progresando ÷ ejercicios con datos suficientes × 100 (últimas 8 semanas).',
      inputs: {
        progressing: strength.summary.PROGRESSING,
        plateau: strength.summary.POTENTIAL_PLATEAU,
        regression: strength.summary.REGRESSION,
      },
    },
    cardioProgress: {
      value:
        evo.cardio.changePct === null ||
        evo.cardio.trend === 'INSUFFICIENT_DATA'
          ? null
          : Math.round(clamp(50 + evo.cardio.changePct * 10, 0, 100)),
      formula:
        '50 + 10 × cambio (%) de eficiencia o velocidad entre las dos mitades de las últimas 12 semanas, acotado a 0–100. 50 = sin cambio.',
      inputs: { changePct: evo.cardio.changePct, kind: evo.cardio.kind },
    },
    loadBalance: {
      value:
        ratio === null
          ? null
          : Math.round(clamp(100 - Math.abs(ratio - 1) * 100, 0, 100)),
      formula:
        '100 − |carga reciente ÷ carga habitual − 1| × 100, acotado a 0–100. 100 = entrenas lo habitual.',
      inputs: { recent: fatigue.load.recent, usual: fatigue.load.usual, ratio },
    },
  };

  // --- Calidad de datos ---
  const allPast = input.sessions.filter((s) => daysBetween(s.day, today) >= 0);
  const cardioAll = allPast.filter((s) => isCardio(s.kind));
  const share = (n: number, total: number) => (total ? round(n / total, 2) : 0);
  const rpeCoverage = share(
    allPast.filter((s) => sessionRpe(s)?.source === 'RECORDED').length,
    allPast.length,
  );
  const hrCoverage = share(
    cardioAll.filter((s) => s.avgHeartRate).length,
    cardioAll.length,
  );
  const hasHeartConfig = !!input.heartConfig?.maxHr;
  const anySets = allPast.some((s) => s.sets.length > 0);
  const missing: string[] = [];
  if (!allPast.length)
    missing.push('Registra entrenos para empezar a ver tu rendimiento.');
  if (allPast.some((s) => s.kind === 'STRENGTH') && !anySets) {
    missing.push('Apunta los ejercicios y series de tus sesiones de fuerza.');
  }
  if (anySets && muscles.rirCoverage < 0.5) {
    missing.push(
      'Apunta el RIR de tus series: afina el 1RM estimado y la carga.',
    );
  }
  if (allPast.length >= 3 && rpeCoverage < 0.5) {
    missing.push(
      'Apunta el esfuerzo (RPE) de cada sesión: es la base de la carga.',
    );
  }
  if (cardioAll.length >= 3 && hrCoverage < 0.5) {
    missing.push(
      'Registra la frecuencia cardíaca en el cardio para medir tu eficiencia.',
    );
  }
  if (cardioAll.length && !hasHeartConfig) {
    missing.push(
      'Indica tu FC máxima y en reposo para calcular zonas y TRIMP.',
    );
  }
  if (allPast.length && historyDays < 28) {
    missing.push(
      'Con 4 semanas de historial se podrá comparar tu carga con la habitual.',
    );
  }
  const level: DataLevel = !allPast.length
    ? 'NONE'
    : historyDays >= 56 && allPast.length >= 16 && missing.length <= 1
      ? 'HIGH'
      : historyDays >= 28 && allPast.length >= 8
        ? 'MEDIUM'
        : 'LOW';

  return {
    period,
    from,
    to: today,
    totals: {
      sessions: inPeriod.length,
      strengthSessions: strengthSessions.length,
      cardioSessions: cardioSessions.length,
      otherSessions:
        inPeriod.length - strengthSessions.length - cardioSessions.length,
      durationSec: sum(inPeriod.map((s) => s.durationSec)),
      activeDays: new Set(inPeriod.map((s) => s.day)).size,
      strengthVolumeKg: round(volume, 1),
      workingSets,
      cardioDistanceM: sum(cardioSessions.map((s) => s.distanceM ?? 0)),
    },
    strength: {
      trend: evo.strength.trend,
      changePct: evo.strength.changePct,
      byStatus: strength.summary,
      records: strength.exercises.flatMap((e) =>
        e.bestE1rm &&
        e.sessions > 1 &&
        daysBetween(e.bestE1rm.day, today) >= 0 &&
        (days === null || daysBetween(e.bestE1rm.day, today) < days)
          ? [
              {
                exerciseId: e.exerciseId,
                name: e.name,
                e1rm: e.bestE1rm.value,
                day: e.bestE1rm.day,
              },
            ]
          : [],
      ),
    },
    cardio: {
      trend: evo.cardio.trend,
      changePct: evo.cardio.changePct,
      kind: evo.cardio.kind,
      byKind: cardio.byKind,
    },
    load: {
      recent: fatigue.load.recent,
      usual: fatigue.load.usual,
      ratio,
      status: fatigue.load.status,
      demandingLast7: fatigue.demanding.last7,
      recovery: fatigue.estimatedRecovery.status,
    },
    muscleDistribution: MUSCLES.map((muscle) => {
      const sets = muscleSets.get(muscle) ?? 0;
      return {
        muscle,
        weightedSets: round(sets, 2),
        share: totalMuscleSets ? round(sets / totalMuscleSets, 3) : 0,
      };
    }),
    plateaus,
    hybrid: {
      verdict: evo.verdict,
      strengthTimeShare: hybrid.balance.strengthTimeShare,
      strengthLoadShare: hybrid.balance.strengthLoadShare,
      flags: hybrid.balance.flags,
    },
    indices,
    dataQuality: {
      level,
      historyDays,
      sessions: allPast.length,
      rirCoverage: muscles.rirCoverage,
      rpeCoverage,
      heartRateCoverage: hrCoverage,
      hasHeartConfig,
      missing,
    },
  };
}
