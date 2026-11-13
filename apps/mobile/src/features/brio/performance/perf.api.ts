import { call, type ActivitySession, type LogActivityBody } from '../api';

/**
 * Contrato de los endpoints del motor de rendimiento (`/brio/performance/*`,
 * `/brio/exercises`, `/brio/heart-config`). Tipos a mano, igual que en
 * `../api.ts`: solo lo que las pantallas usan.
 */

export type Period = '7d' | '30d' | '90d' | '6m' | 'all';
export type Status = 'PROGRESSING' | 'POTENTIAL_PLATEAU' | 'REGRESSION' | 'INSUFFICIENT_DATA';
export type Trend = 'UP' | 'STABLE' | 'DOWN' | 'INSUFFICIENT_DATA';

export interface Exercise {
  id: string;
  code: string | null;
  name: string;
  isBodyweight: boolean;
  /** null = del catálogo; con valor = creado por el usuario. */
  ownerUserId: string | null;
  /** true si el usuario ha ajustado los pesos de un ejercicio del catálogo. */
  customized: boolean;
  muscles: { muscle: string; weight: number }[];
}

export interface HeartConfig {
  maxHr: number | null;
  restingHr: number | null;
  method: 'MAX_HR' | 'HR_RESERVE' | 'CUSTOM';
  customZones: number[] | null;
}

export interface SessionPatch {
  startedAt?: string;
  durationSec?: number;
  distanceM?: number | null;
  avgHeartRate?: number | null;
  maxHeartRate?: number | null;
  elevationGainM?: number | null;
  cadence?: number | null;
  rpe?: number | null;
  zoneSeconds?: number[] | null;
  notes?: string | null;
}

export interface Measurement {
  id: string;
  metric: 'VO2MAX' | 'LACTATE_THRESHOLD_PACE';
  value: number;
  heartRate: number | null;
  origin: 'LAB_TEST' | 'DEVICE' | 'FIELD_TEST';
  sourceLabel: string | null;
  measuredOn: string;
}

export interface PerfIndex {
  value: number | null;
  formula: string;
  inputs: Record<string, number | string | null>;
}

export interface Summary {
  period: Period;
  from: string | null;
  to: string;
  totals: {
    sessions: number;
    strengthSessions: number;
    cardioSessions: number;
    durationSec: number;
    activeDays: number;
    strengthVolumeKg: number;
    workingSets: number;
    cardioDistanceM: number;
  };
  strength: {
    trend: Trend;
    changePct: number | null;
    byStatus: Record<Status, number>;
    records: { exerciseId: string; name: string; e1rm: number; day: string }[];
  };
  cardio: { trend: Trend; changePct: number | null; kind: string | null };
  load: { recent: number; usual: number; ratio: number | null; status: string; demandingLast7: number; recovery: string };
  muscleDistribution: { muscle: string; weightedSets: number; share: number }[];
  plateaus: { discipline: 'STRENGTH' | 'CARDIO'; subject: string; name: string; status: Status; changePct: number | null; sessions: number }[];
  hybrid: { verdict: string; strengthTimeShare: number | null; strengthLoadShare: number | null; flags: string[] };
  indices: { consistency: PerfIndex; strengthProgress: PerfIndex; cardioProgress: PerfIndex; loadBalance: PerfIndex };
  dataQuality: { level: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'; historyDays: number; sessions: number; missing: string[] };
}

export interface Recommendation {
  id: string;
  code: string;
  category: 'STRENGTH' | 'CARDIO' | 'LOAD' | 'MUSCLE' | 'HYBRID' | 'DATA';
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  explanation: string;
  data: Record<string, unknown>;
  period: { from: string; to: string };
  status: 'ACTIVE' | 'DISMISSED' | 'RESOLVED';
  detectedOn: string;
}

export interface BestSet {
  weightKg: number;
  reps: number;
  rir: number | null;
  day: string;
  e1rm: number | null;
}

export interface ExerciseAnalysis {
  exerciseId: string;
  name: string;
  history: { day: string; e1rm: number | null; volumeKg: number; topWeightKg: number; maxReps: number; workingSets: number }[];
  sessions: number;
  lastDay: string | null;
  bestE1rm: { value: number; day: string } | null;
  bestSet: BestSet | null;
  heaviestKg: number | null;
  totalVolumeKg: number;
  currentE1rm: number | null;
  rirCoverage: number;
  /** Lo hecho en el periodo pedido. */
  period: {
    sessions: number;
    workingSets: number;
    volumeKg: number;
    bestE1rm: number | null;
    firstE1rm: number | null;
    lastE1rm: number | null;
    changePct: number | null;
  };
  plateau: {
    status: Status;
    signals: string[];
    evidence: {
      metric: 'E1RM' | 'MAX_REPS';
      sessions: number;
      baselineMedian: number | null;
      recentMedian: number | null;
      changePct: number | null;
      trendPctPerWeek: number | null;
      daysSinceRecord: number | null;
      repsChangePct: number | null;
      volumeChangePct: number | null;
    };
  };
}

export interface StrengthAnalysis {
  exercises: ExerciseAnalysis[];
  summary: Record<Status, number>;
}

export interface MuscleWindow {
  directSets: number;
  weightedSets: number;
  effectiveSets: number;
  volumeKg: number;
  sessions: number;
}

export interface MuscleAnalysis {
  muscle: string;
  last7: MuscleWindow;
  last30: MuscleWindow;
  last90: MuscleWindow;
  allTime: MuscleWindow;
  /** El periodo pedido. */
  period: MuscleWindow;
  weeklyFrequency: number;
  weeklySets: number[];
  avgWeeklySets: number;
  volumeChangePct: number | null;
  volumeTrend: Trend;
  avgLoadKg: number | null;
  loadTrend: Trend;
  lastTrainedDay: string | null;
  daysSinceLast: number | null;
  relativeLoad: number;
}

export interface MuscleResult {
  muscles: MuscleAnalysis[];
  rirCoverage: number;
}

export interface MeasuredOrEstimated {
  measured: { value: number; heartRate: number | null; origin: string; sourceLabel: string | null; measuredOn: string } | null;
  estimated: { value: number; heartRate: number | null; method: string; basisDay: string; caveats: string[] } | null;
  noEstimateReason: string | null;
}

export interface CardioAnalysis {
  zones: { zone: number; min: number; max: number | null }[] | null;
  timeInZones: { seconds: number[]; recordedSec: number; estimatedSec: number; unassignedSessions: number };
  byKind: {
    kind: string;
    sessions: number;
    distanceM: number;
    durationSec: number;
    elevationGainM: number;
    avgPaceSecPerKm: number | null;
    avgSpeedKmh: number | null;
    avgHeartRate: number | null;
  }[];
  plateaus: {
    kind: string;
    status: Status;
    signals: string[];
    evidence: {
      metric: 'EFFICIENCY' | 'SPEED';
      sessions: number;
      changePct: number | null;
      baselinePaceSecPerKm: number | null;
      recentPaceSecPerKm: number | null;
      hrShiftAtSimilarPace: number | null;
      daysSinceBestEffort: number | null;
    };
  }[];
  predictions: {
    basis: { day: string; distanceM: number; durationSec: number; hardEffort: boolean };
    predictions: { race: string; timeSec: number; lowSec: number; highSec: number; uncertaintyPct: number; extrapolated: boolean }[];
    assumptions: string[];
  } | null;
  vo2max: MeasuredOrEstimated;
  lactateThreshold: MeasuredOrEstimated;
}

export interface FatigueAnalysis {
  period: { days: number | null; sessions: number; load: number; avgWeeklyLoad: number; demandingSessions: number; activeDays: number };
  load: {
    recent: number;
    usual: number;
    ratio: number | null;
    status: string;
    last7: number;
    previous7: number;
    weekChangePct: number | null;
    weekly: number[];
    monotony: number | null;
  };
  cardioLoad: { last7: number; previous7: number; sessionsWithTrimp: number; sessionsWithoutHr: number } | null;
  demanding: { last7: number; last14: number; maxConsecutiveDays: number };
  rest: { restDaysLast7: number; currentStreakDays: number; minHoursBetweenSessions: number | null };
  imbalances: { pushPullRatio: number | null; upperLowerRatio: number | null; neglected: { muscle: string; daysSinceLast: number | null }[] };
  estimatedRecovery: { status: string; basis: string[]; hoursSinceLastDemanding: number | null };
  dataQuality: { sessions: number; withRecordedRpe: number; withEstimatedRpe: number; withoutLoad: number; historyDays: number };
}

export interface HybridAnalysis {
  balance: {
    windowDays: number;
    strength: { sessions: number; minutes: number; load: number };
    cardio: { sessions: number; minutes: number; load: number };
    strengthTimeShare: number | null;
    strengthLoadShare: number | null;
    intensity: { easy: number; moderate: number; hard: number; unknown: number };
    daysSinceStrength: number | null;
    daysSinceCardio: number | null;
    flags: string[];
  };
  lowerBody: {
    events: { sessionId: string; day: string; type: string; demanding: boolean; amount: number }[];
    demandingLast7: number;
    maxConsecutiveDemandingDays: number;
    closePairs: { hoursApart: number; mixed: boolean }[];
  };
  interference: {
    cardioLoadVsStrengthPerf: { r: number | null; pairedWeeks: number; association: string };
    strengthLoadVsCardioPerf: { r: number | null; pairedWeeks: number; association: string };
    caveats: string[];
  };
  evolution: {
    strength: { trend: Trend; changePct: number | null; exercisesUsed: number };
    cardio: { trend: Trend; changePct: number | null; kind: string | null };
    verdict: string;
  };
}

const q = (period: Period) => ({ params: { query: { period } } });

export const perfApi = {
  exercises: () => call<Exercise[]>('GET', '/brio/exercises'),
  createExercise: (body: { name: string; isCompound?: boolean; isBodyweight?: boolean; muscles: { muscle: string; weight: number }[] }) =>
    call<Exercise>('POST', '/brio/exercises', { body }),
  measurements: () => call<Measurement[]>('GET', '/brio/performance/measurements'),
  addMeasurement: (body: Omit<Measurement, 'id' | 'heartRate' | 'sourceLabel'> & { heartRate?: number; sourceLabel?: string }) =>
    call<Measurement>('POST', '/brio/performance/measurements', { body }),
  deleteMeasurement: (id: string) => call<void>('DELETE', `/brio/performance/measurements/${id}`),
  setExerciseMuscles: (id: string, muscles: { muscle: string; weight: number }[]) =>
    call<Exercise>('PUT', `/brio/exercises/${id}/muscles`, { body: { muscles } }),
  resetExerciseMuscles: (id: string) => call<Exercise>('DELETE', `/brio/exercises/${id}/muscles`),
  /** Historial, del más reciente al más antiguo. `before` es el `startedAt` del último recibido. */
  history: (before: string | null, limit: number) =>
    call<ActivitySession[]>('GET', '/brio/activities', {
      params: { query: { limit, ...(before ? { before } : {}) } },
    }),
  session: (id: string) => call<ActivitySession>('GET', `/brio/activities/${id}`),
  /** Edición parcial: `null` vacía un campo opcional. */
  updateSession: (id: string, body: SessionPatch) =>
    call<ActivitySession>('PATCH', `/brio/activities/${id}`, { body }),
  replaceSets: (sessionId: string, exercises: NonNullable<LogActivityBody['exercises']>) =>
    call<ActivitySession>('PUT', `/brio/activities/${sessionId}/sets`, { body: { exercises } }),
  allRecommendations: () =>
    call<Recommendation[]>('GET', '/brio/performance/recommendations', {
      params: { query: { includeDismissed: 'true' } },
    }),
  heartConfig: () => call<HeartConfig>('GET', '/brio/heart-config'),
  saveHeartConfig: (body: { method: HeartConfig['method']; maxHr?: number; restingHr?: number; customZones?: number[] }) =>
    call<HeartConfig>('PUT', '/brio/heart-config', { body }),
  summary: (period: Period) => call<Summary>('GET', '/brio/performance/summary', q(period)),
  recommendations: () => call<Recommendation[]>('GET', '/brio/performance/recommendations'),
  dismiss: (id: string) =>
    call<void>('PUT', '/brio/performance/recommendations/status', { body: { id, status: 'DISMISSED' } }),
  restore: (id: string) =>
    call<void>('PUT', '/brio/performance/recommendations/status', { body: { id, status: 'ACTIVE' } }),
  strength: (period: Period) => call<StrengthAnalysis>('GET', '/brio/performance/strength', q(period)),
  muscles: (period: Period) => call<MuscleResult>('GET', '/brio/performance/muscles', q(period)),
  cardio: (period: Period) => call<CardioAnalysis>('GET', '/brio/performance/cardio', q(period)),
  fatigue: (period: Period) => call<FatigueAnalysis>('GET', '/brio/performance/fatigue', q(period)),
  hybrid: (period: Period) => call<HybridAnalysis>('GET', '/brio/performance/hybrid', q(period)),
};
