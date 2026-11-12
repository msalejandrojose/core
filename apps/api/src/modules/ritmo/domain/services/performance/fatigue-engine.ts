import type {
  HeartConfig,
  TrainingSession,
} from '../../entities/performance.entity';
import { isCardio } from './cardio-engine';
import type { MuscleAnalysisResult } from './muscle-engine';
import {
  addDays,
  daysBetween,
  ewma,
  mean,
  pctChange,
  round,
  stdDev,
  sum,
} from './stats';

/**
 * FatigueEngine: carga de entrenamiento acumulada (fuerza y cardio juntas).
 *
 * Son indicadores de CARGA, no de estado fisiológico: no predicen lesiones ni
 * miden la recuperación muscular. Cada bloque lleva `source` para distinguir
 * lo registrado, lo calculado y lo estimado.
 */

export type Source = 'RECORDED' | 'CALCULATED' | 'ESTIMATED';

// ---------------------------- Carga de sesión -----------------------------

export interface SessionRpe {
  value: number;
  /** RECORDED si el usuario apuntó el RPE; ESTIMATED si se dedujo. */
  source: 'RECORDED' | 'ESTIMATED';
}

/** RPE que se asume para el registro rápido de esfuerzo. */
const EFFORT_RPE = { LIGHT: 3, MODERATE: 5, VIGOROUS: 8 } as const;

/**
 * RPE de la sesión (CR10). Por orden: el apuntado; el del registro rápido
 * (ligero 3, moderado 5, intenso 8); y en fuerza, 10 − RIR medio (entre 5 y
 * 10). Si no hay nada de eso, null: no se inventa.
 */
export function sessionRpe(s: TrainingSession): SessionRpe | null {
  if (s.rpe !== null) return { value: s.rpe, source: 'RECORDED' };
  if (s.effort) return { value: EFFORT_RPE[s.effort], source: 'ESTIMATED' };
  const rirs = s.sets.flatMap((x) =>
    x.isWarmup || x.rir === null ? [] : [x.rir],
  );
  const avg = mean(rirs);
  if (avg === null) return null;
  return {
    value: Math.min(10, Math.max(5, Math.round(10 - avg))),
    source: 'ESTIMATED',
  };
}

/** Carga por Session RPE (Foster): RPE × minutos, en unidades arbitrarias (UA). */
export function sessionLoad(s: TrainingSession): number | null {
  const rpe = sessionRpe(s);
  return rpe ? Math.round(rpe.value * (s.durationSec / 60)) : null;
}

/** Sesión exigente: RPE (apuntado o deducido) de 8 o más. */
export function isDemanding(s: TrainingSession): boolean {
  return (sessionRpe(s)?.value ?? 0) >= 8;
}

export type Sex = 'MALE' | 'FEMALE' | 'OTHER' | null;

/**
 * TRIMP de Banister: minutos × FCr × k·e^(b·FCr), con FCr = fracción de la
 * reserva cardíaca. Coeficientes de Banister por sexo; si no se conoce, la
 * media de ambos. Necesita FC media, FC máxima y FC en reposo: sin las tres
 * devuelve null.
 */
export function trimp(
  s: TrainingSession,
  heart: HeartConfig | null,
  sex: Sex,
): number | null {
  if (!s.avgHeartRate || !heart?.maxHr || !heart.restingHr) return null;
  const reserve = heart.maxHr - heart.restingHr;
  if (reserve <= 0) return null;
  const hrr = Math.min(
    1,
    Math.max(0, (s.avgHeartRate - heart.restingHr) / reserve),
  );
  const male = 0.64 * Math.exp(1.92 * hrr);
  const female = 0.86 * Math.exp(1.67 * hrr);
  const k =
    sex === 'MALE' ? male : sex === 'FEMALE' ? female : (male + female) / 2;
  return round((s.durationSec / 60) * hrr * k, 1);
}

// ------------------------------- Análisis ---------------------------------

/** Ventanas de la media exponencial: carga reciente y carga habitual. */
export const ACUTE_SPAN_DAYS = 7;
export const CHRONIC_SPAN_DAYS = 28;
/** Días de historial mínimos para comparar reciente con habitual. */
const MIN_HISTORY_DAYS = 28;
/** Días hacia atrás que se cargan en la serie diaria. */
const SERIES_DAYS = 84;

export type LoadStatus =
  | 'WELL_BELOW_USUAL'
  | 'BELOW_USUAL'
  | 'USUAL'
  | 'ABOVE_USUAL'
  | 'WELL_ABOVE_USUAL'
  | 'INSUFFICIENT_DATA';

/** Lectura de la razón reciente/habitual. Son umbrales orientativos. */
function loadStatus(ratio: number | null): LoadStatus {
  if (ratio === null) return 'INSUFFICIENT_DATA';
  if (ratio < 0.6) return 'WELL_BELOW_USUAL';
  if (ratio < 0.8) return 'BELOW_USUAL';
  if (ratio <= 1.3) return 'USUAL';
  if (ratio <= 1.5) return 'ABOVE_USUAL';
  return 'WELL_ABOVE_USUAL';
}

export type RecoveryStatus =
  | 'FRESH'
  | 'NORMAL'
  | 'LOADED'
  | 'HIGH_LOAD'
  | 'INSUFFICIENT_DATA';

export interface FatigueAnalysis {
  /** Carga diaria por Session RPE (UA), del día más antiguo a hoy. */
  daily: { day: string; load: number; sessions: number }[];
  load: {
    source: 'CALCULATED';
    /** Media exponencial de 7 días (UA/día). */
    recent: number;
    /** Media exponencial de 28 días (UA/día). */
    usual: number;
    /** Reciente / habitual; null sin 28 días de historial. */
    ratio: number | null;
    status: LoadStatus;
    /** Total de los últimos 7 días y de los 7 anteriores. */
    last7: number;
    previous7: number;
    weekChangePct: number | null;
    /** Totales semanales de las últimas 8 semanas (la última es la actual). */
    weekly: number[];
    /** Monotonía de Foster: media diaria / desviación típica de 7 días. */
    monotony: number | null;
    /** Tensión de Foster: carga semanal × monotonía. */
    strain: number | null;
  };
  /** Carga cardiovascular por TRIMP; null si faltan FC máxima o en reposo. */
  cardioLoad: {
    source: 'CALCULATED';
    last7: number;
    previous7: number;
    sessionsWithTrimp: number;
    sessionsWithoutHr: number;
  } | null;
  demanding: {
    source: 'CALCULATED';
    /** Sesiones con RPE ≥ 8 en los últimos 7 días. */
    last7: number;
    last14: number;
    /** Racha más larga de días seguidos con sesión exigente (14 días). */
    maxConsecutiveDays: number;
    /** Días de las sesiones exigentes de los últimos 14 días. */
    days: string[];
  };
  rest: {
    source: 'CALCULATED';
    /** Días sin ninguna sesión en los últimos 7. */
    restDaysLast7: number;
    /** Días seguidos entrenando hasta hoy. */
    currentStreakDays: number;
    /** Horas entre las dos sesiones más juntas de los últimos 7 días. */
    minHoursBetweenSessions: number | null;
  };
  /** Desequilibrios de trabajo muscular en 30 días (de las series registradas). */
  imbalances: {
    source: 'CALCULATED';
    /** Series ponderadas de empuje / tirón; null si falta alguno. */
    pushPullRatio: number | null;
    /** Series ponderadas de tren superior / inferior. */
    upperLowerRatio: number | null;
    /** Músculos sin trabajo directo ni secundario en 14 días o más. */
    neglected: { muscle: string; daysSinceLast: number | null }[];
  };
  /**
   * Lectura orientativa a partir de la carga: NO mide la recuperación del
   * cuerpo (no hay sueño ni variabilidad cardíaca).
   */
  estimatedRecovery: {
    source: 'ESTIMATED';
    status: RecoveryStatus;
    /** En qué se basa. */
    basis: string[];
    hoursSinceLastDemanding: number | null;
  };
  dataQuality: {
    sessions: number;
    /** Sesiones cuya carga usa un RPE apuntado. */
    withRecordedRpe: number;
    /** Sesiones cuya carga usa un RPE deducido (registro rápido o RIR). */
    withEstimatedRpe: number;
    /** Sesiones sin ningún dato de esfuerzo: no entran en la carga. */
    withoutLoad: number;
    historyDays: number;
  };
}

const PUSH = ['CHEST', 'FRONT_DELT', 'SIDE_DELT', 'TRICEPS'];
const PULL = ['LATS', 'TRAPS', 'REAR_DELT', 'BICEPS'];
const LOWER = ['QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES'];
const UPPER = [...PUSH, ...PULL, 'FOREARMS'];
const NEGLECTED_DAYS = 14;

export interface FatigueOptions {
  today: string;
  /** Instante actual, para las horas desde la última sesión. */
  now: Date;
  sex: Sex;
}

export function analyzeFatigue(
  sessions: TrainingSession[],
  heart: HeartConfig | null,
  muscles: MuscleAnalysisResult,
  options: FatigueOptions,
): FatigueAnalysis {
  const { today, now } = options;
  const past = sessions
    .filter((s) => daysBetween(s.day, today) >= 0)
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  const firstDay = past[0]?.day ?? null;
  const historyDays = firstDay ? daysBetween(firstDay, today) + 1 : 0;

  // Serie diaria desde el primer entreno (o desde hace 84 días), con ceros.
  const seriesDays = Math.min(SERIES_DAYS, Math.max(historyDays, 1));
  const daily = Array.from({ length: seriesDays }, (_, i) => ({
    day: addDays(today, -(seriesDays - 1 - i)),
    load: 0,
    sessions: 0,
  }));
  const index = new Map(daily.map((d, i) => [d.day, i]));
  let recorded = 0;
  let estimated = 0;
  let withoutLoad = 0;
  for (const s of past) {
    const rpe = sessionRpe(s);
    if (!rpe) withoutLoad += 1;
    else if (rpe.source === 'RECORDED') recorded += 1;
    else estimated += 1;
    const i = index.get(s.day);
    if (i === undefined) continue;
    daily[i].sessions += 1;
    daily[i].load += sessionLoad(s) ?? 0;
  }

  const loads = daily.map((d) => d.load);
  const acute = ewma(loads, ACUTE_SPAN_DAYS);
  const chronic = ewma(loads, CHRONIC_SPAN_DAYS);
  const recent = acute[acute.length - 1] ?? 0;
  const usual = chronic[chronic.length - 1] ?? 0;
  const ratio =
    historyDays >= MIN_HISTORY_DAYS && usual > 0
      ? round(recent / usual, 2)
      : null;
  const tail = (from: number, to: number) =>
    sum(
      loads.slice(
        Math.max(0, loads.length - to),
        Math.max(0, loads.length - from),
      ),
    );
  const last7 = tail(0, 7);
  const previous7 = tail(7, 14);
  const week = loads.slice(-7);
  const sd = week.length === 7 ? stdDev(week) : null;
  const monotony = sd ? round((mean(week) ?? 0) / sd, 2) : null;

  const within = (days: number) =>
    past.filter((s) => daysBetween(s.day, today) < days);
  const last14 = within(14);
  const demanding14 = last14.filter(isDemanding);
  const demandingDays = [...new Set(demanding14.map((s) => s.day))].sort();
  let streak = 0;
  let maxStreak = 0;
  demandingDays.forEach((d, i) => {
    streak =
      i > 0 && daysBetween(demandingDays[i - 1], d) === 1 ? streak + 1 : 1;
    maxStreak = Math.max(maxStreak, streak);
  });

  const week7 = within(7);
  const trainedDays = new Set(week7.map((s) => s.day));
  let currentStreak = 0;
  const allDays = new Set(past.map((s) => s.day));
  while (allDays.has(addDays(today, -currentStreak))) currentStreak += 1;
  let minGap: number | null = null;
  week7.forEach((s, i) => {
    if (i === 0) return;
    const prevEnd =
      week7[i - 1].startedAt.getTime() + week7[i - 1].durationSec * 1000;
    // Dos sesiones solapadas (o mal fechadas) no dan horas negativas.
    const gap = Math.max(0, (s.startedAt.getTime() - prevEnd) / 3_600_000);
    if (minGap === null || gap < minGap) minGap = gap;
  });

  const cardio = past.filter((s) => isCardio(s.kind));
  const trimps = cardio.map((s) => ({ s, t: trimp(s, heart, options.sex) }));
  const trimpIn = (from: number, to: number) =>
    round(
      sum(
        trimps
          .filter(({ s }) => {
            const age = daysBetween(s.day, today);
            return age >= from && age < to;
          })
          .map(({ t }) => t ?? 0),
      ),
      1,
    );
  const canTrimp = !!heart?.maxHr && !!heart.restingHr;

  const sets30 = (names: string[]) =>
    sum(
      muscles.muscles
        .filter((m) => names.includes(m.muscle))
        .map((m) => m.last30.weightedSets),
    );
  const ratioOf = (a: number, b: number) =>
    a > 0 && b > 0 ? round(a / b, 2) : null;
  const anyStrength = muscles.muscles.some((m) => m.last90.weightedSets > 0);

  const lastDemanding = [...past].reverse().find(isDemanding);
  const hoursSinceLastDemanding = lastDemanding
    ? round(
        (now.getTime() -
          (lastDemanding.startedAt.getTime() +
            lastDemanding.durationSec * 1000)) /
          3_600_000,
        0,
      )
    : null;
  const status = loadStatus(ratio);
  const demanding7 = week7.filter(isDemanding).length;
  let recovery: RecoveryStatus = 'INSUFFICIENT_DATA';
  const basis: string[] = [];
  if (ratio !== null) {
    if (status === 'WELL_ABOVE_USUAL' || maxStreak >= 3) recovery = 'HIGH_LOAD';
    else if (status === 'ABOVE_USUAL' || demanding7 >= 3) recovery = 'LOADED';
    else if (status === 'BELOW_USUAL' || status === 'WELL_BELOW_USUAL') {
      recovery = 'FRESH';
    } else recovery = 'NORMAL';
    basis.push(`Carga reciente ${ratio} veces la habitual.`);
    basis.push(`${demanding7} sesiones exigentes en 7 días.`);
    if (maxStreak >= 2)
      basis.push(`${maxStreak} días seguidos con sesión exigente.`);
  } else {
    basis.push(
      'Hacen falta al menos 28 días de entrenos para comparar con tu carga habitual.',
    );
  }
  basis.push(
    'No incluye sueño ni variabilidad cardíaca: es una lectura de la carga, no del cuerpo.',
  );

  return {
    daily,
    load: {
      source: 'CALCULATED',
      recent: round(recent, 1),
      usual: round(usual, 1),
      ratio,
      status,
      last7,
      previous7,
      weekChangePct: (() => {
        const c = pctChange(previous7, last7);
        return c === null ? null : round(c, 1);
      })(),
      weekly: Array.from({ length: 8 }, (_, i) =>
        tail((7 - i) * 7, (8 - i) * 7),
      ),
      monotony,
      strain: monotony === null ? null : Math.round(last7 * monotony),
    },
    cardioLoad: canTrimp
      ? {
          source: 'CALCULATED',
          last7: trimpIn(0, 7),
          previous7: trimpIn(7, 14),
          sessionsWithTrimp: trimps.filter(({ t }) => t !== null).length,
          sessionsWithoutHr: trimps.filter(({ t }) => t === null).length,
        }
      : null,
    demanding: {
      source: 'CALCULATED',
      last7: demanding7,
      last14: demanding14.length,
      maxConsecutiveDays: maxStreak,
      days: demandingDays,
    },
    rest: {
      source: 'CALCULATED',
      restDaysLast7: 7 - trainedDays.size,
      currentStreakDays: currentStreak,
      minHoursBetweenSessions: minGap === null ? null : round(minGap, 1),
    },
    imbalances: {
      source: 'CALCULATED',
      pushPullRatio: ratioOf(sets30(PUSH), sets30(PULL)),
      upperLowerRatio: ratioOf(sets30(UPPER), sets30(LOWER)),
      neglected: anyStrength
        ? muscles.muscles
            .filter(
              (m) =>
                m.daysSinceLast === null || m.daysSinceLast >= NEGLECTED_DAYS,
            )
            .map((m) => ({ muscle: m.muscle, daysSinceLast: m.daysSinceLast }))
        : [],
    },
    estimatedRecovery: {
      source: 'ESTIMATED',
      status: recovery,
      basis,
      hoursSinceLastDemanding,
    },
    dataQuality: {
      sessions: past.length,
      withRecordedRpe: recorded,
      withEstimatedRpe: estimated,
      withoutLoad,
      historyDays,
    },
  };
}
