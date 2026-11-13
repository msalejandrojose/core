import {
  CARDIO_KINDS,
  type ActivityKind,
  type HeartConfig,
  type PerfOrigin,
  type PerformanceMeasurement,
  type TrainingSession,
} from '../../entities/performance.entity';
import {
  daysBetween,
  mean,
  median,
  pctChange,
  round,
  sum,
  trendPctPerWeek,
} from './stats';

/**
 * CardioEngine: análisis cardiovascular.
 *
 * Cada resultado dice de dónde sale: REGISTRADO (lo que apuntó el usuario o su
 * dispositivo), CALCULADO (aritmética sobre lo registrado) o ESTIMADO (un
 * modelo con condiciones de validez). Las estimaciones nunca se presentan
 * como mediciones.
 */

// ------------------------------- Zonas ------------------------------------

export interface HeartZone {
  zone: 1 | 2 | 3 | 4 | 5;
  /** Límites en ppm: [min, max). En Z5, `max` es la FC máxima si se conoce. */
  min: number;
  max: number | null;
}

/** Límite superior de Z1..Z4 como fracción (de la FC máxima o de la reserva). */
const ZONE_CUTS = [0.6, 0.7, 0.8, 0.9];
/** Suelo de Z1: por debajo es actividad muy ligera y no se asigna a zona. */
const ZONE_FLOOR = 0.5;

/**
 * Zonas cardíacas del usuario, o null si falta lo necesario.
 * - MAX_HR: 50–60–70–80–90–100 % de la FC máxima.
 * - HR_RESERVE (Karvonen): los mismos porcentajes sobre la reserva (máx − reposo).
 * - CUSTOM: los cuatro límites que haya puesto el usuario.
 */
export function heartZones(config: HeartConfig | null): HeartZone[] | null {
  if (!config) return null;
  const { maxHr, restingHr, method, customZones } = config;
  let floor: number;
  let cuts: number[];
  if (method === 'CUSTOM') {
    if (customZones?.length !== 4) return null;
    cuts = customZones;
    floor = maxHr ? Math.round(maxHr * ZONE_FLOOR) : 0;
  } else if (method === 'HR_RESERVE') {
    if (!maxHr || !restingHr || restingHr >= maxHr) return null;
    const at = (f: number) => Math.round(restingHr + f * (maxHr - restingHr));
    cuts = ZONE_CUTS.map(at);
    floor = at(ZONE_FLOOR);
  } else {
    if (!maxHr) return null;
    cuts = ZONE_CUTS.map((f) => Math.round(maxHr * f));
    floor = Math.round(maxHr * ZONE_FLOOR);
  }
  const bounds = [floor, ...cuts];
  return [1, 2, 3, 4, 5].map((zone, i) => ({
    zone: zone as HeartZone['zone'],
    min: bounds[i],
    max: i < 4 ? bounds[i + 1] : (maxHr ?? null),
  }));
}

/** Zona (1–5) de una frecuencia cardíaca; null por debajo de Z1. */
export function zoneOf(hr: number, zones: HeartZone[]): number | null {
  if (hr < zones[0].min) return null;
  for (const z of zones) if (z.max === null || hr < z.max) return z.zone;
  return 5;
}

export interface TimeInZones {
  windowDays: number;
  /** Segundos en Z1..Z5. */
  seconds: number[];
  /** Parte que viene del dispositivo (tiempo por zona registrado). */
  recordedSec: number;
  /**
   * Parte aproximada: sesiones sin desglose, asignadas enteras a la zona de
   * su FC media. Sobrestima la zona central y oculta los picos.
   */
  estimatedSec: number;
  /** Sesiones que no se han podido repartir: sin FC, o sin zonas configuradas. */
  unassignedSessions: number;
}

export function timeInZones(
  sessions: TrainingSession[],
  zones: HeartZone[] | null,
  today: string,
  windowDays: number,
): TimeInZones {
  const out: TimeInZones = {
    windowDays,
    seconds: [0, 0, 0, 0, 0],
    recordedSec: 0,
    estimatedSec: 0,
    unassignedSessions: 0,
  };
  for (const s of sessions) {
    const age = daysBetween(s.day, today);
    if (age < 0 || age >= windowDays || !isCardio(s.kind)) continue;
    if (s.zoneSeconds) {
      s.zoneSeconds.forEach((sec, i) => (out.seconds[i] += sec));
      out.recordedSec += sum(s.zoneSeconds);
    } else if (s.avgHeartRate && zones) {
      const z = zoneOf(s.avgHeartRate, zones);
      if (z) {
        out.seconds[z - 1] += s.durationSec;
        out.estimatedSec += s.durationSec;
      }
    } else {
      out.unassignedSessions += 1;
    }
  }
  return out;
}

// ------------------------------ Sesiones ----------------------------------

export function isCardio(kind: ActivityKind): boolean {
  return CARDIO_KINDS.includes(kind);
}

/** Esfuerzo exigente: RPE ≥ 8 o, sin RPE, el registro rápido «intenso». */
export function isHardEffort(s: TrainingSession): boolean {
  return s.rpe !== null ? s.rpe >= 8 : s.effort === 'VIGOROUS';
}

/** Brío en segundos por km; null sin distancia. */
export function paceSecPerKm(s: TrainingSession): number | null {
  return s.distanceM && s.distanceM > 0
    ? s.durationSec / (s.distanceM / 1000)
    : null;
}

/** Desnivel positivo por km: sirve para no comparar llano con montaña. */
export function climbPerKm(s: TrainingSession): number | null {
  return s.elevationGainM !== null && s.distanceM
    ? s.elevationGainM / (s.distanceM / 1000)
    : null;
}

/** A partir de aquí (m de subida por km) una sesión no se compara con las llanas. */
const HILLY_M_PER_KM = 15;
/** Duración mínima para comparar ritmo y FC: en menos tiempo la FC no se estabiliza. */
const MIN_STEADY_SEC = 20 * 60;

/**
 * Sesiones comparables entre sí: misma disciplina, con distancia, de al menos
 * 20 minutos y sin desnivel fuerte. Si no se apuntó desnivel se aceptan (no se
 * puede saber) y el resultado lo indica en `unknownTerrain`.
 */
function comparable(sessions: TrainingSession[], kind: ActivityKind) {
  return sessions.filter((s) => {
    if (s.kind !== kind || !s.distanceM || s.durationSec < MIN_STEADY_SEC) {
      return false;
    }
    const climb = climbPerKm(s);
    return climb === null || climb <= HILLY_M_PER_KM;
  });
}

// ---------------------------- Predicciones --------------------------------

export const RACES = [
  { key: '5K', distanceM: 5000 },
  { key: '10K', distanceM: 10000 },
  { key: 'HALF_MARATHON', distanceM: 21097.5 },
] as const;
export type RaceKey = (typeof RACES)[number]['key'];

/** Exponente de fatiga de Riegel (1977) para corredores recreativos. */
const RIEGEL_EXPONENT = 1.06;
/** Antigüedad máxima (días) del resultado en que se basa una predicción. */
const PREDICTION_WINDOW_DAYS = 90;
/** Distancia mínima del resultado base: por debajo Riegel no es fiable. */
const MIN_BASIS_M = 3000;

/** Riegel: T2 = T1 × (D2 / D1)^1,06. */
export function riegel(timeSec: number, fromM: number, toM: number): number {
  return timeSec * (toM / fromM) ** RIEGEL_EXPONENT;
}

export interface RacePrediction {
  race: RaceKey;
  distanceM: number;
  /** Tiempo estimado en segundos. */
  timeSec: number;
  /** Horquilla: el modelo no da un punto, da un rango. */
  lowSec: number;
  highSec: number;
  uncertaintyPct: number;
  /** true si la distancia objetivo está muy lejos de la del resultado base. */
  extrapolated: boolean;
}

export interface PredictionSet {
  /** Resultado real del que salen las predicciones. */
  basis: {
    sessionId: string;
    day: string;
    distanceM: number;
    durationSec: number;
    ageDays: number;
    /** false si no fue un esfuerzo exigente: el potencial real será mejor. */
    hardEffort: boolean;
  };
  predictions: RacePrediction[];
  /** Condiciones para que la estimación valga. */
  assumptions: string[];
}

/**
 * Predicción de 5K, 10K y media maratón con Riegel, a partir del mejor
 * resultado de carrera de los últimos 90 días (el de mejor tiempo equivalente
 * en 10K, sobre terreno comparable).
 *
 * Incertidumbre: ±3 % si la base fue un esfuerzo exigente y la distancia
 * objetivo está entre la mitad y el doble; ±6 % si se extrapola más lejos; y
 * hasta ±10 % si la base no fue un esfuerzo exigente, porque entonces el
 * tiempo es un rodaje y no lo que el corredor puede hacer.
 */
export function predictRaces(
  sessions: TrainingSession[],
  today: string,
): PredictionSet | null {
  const candidates = comparable(sessions, 'RUN').filter((s) => {
    const age = daysBetween(s.day, today);
    return (
      age >= 0 && age <= PREDICTION_WINDOW_DAYS && s.distanceM! >= MIN_BASIS_M
    );
  });
  if (!candidates.length) return null;
  const eq10k = (s: TrainingSession) =>
    riegel(s.durationSec, s.distanceM!, 10000);
  const best = candidates.reduce((a, b) => (eq10k(b) < eq10k(a) ? b : a));
  const hardEffort = isHardEffort(best);

  const predictions = RACES.map(({ key, distanceM }) => {
    const ratio = distanceM / best.distanceM!;
    const extrapolated = ratio > 2 || ratio < 0.5;
    const uncertaintyPct = (hardEffort ? 3 : 7) + (extrapolated ? 3 : 0);
    const timeSec = riegel(best.durationSec, best.distanceM!, distanceM);
    return {
      race: key,
      distanceM,
      timeSec: Math.round(timeSec),
      lowSec: Math.round(timeSec * (1 - uncertaintyPct / 100)),
      highSec: Math.round(timeSec * (1 + uncertaintyPct / 100)),
      uncertaintyPct,
      extrapolated,
    };
  });

  return {
    basis: {
      sessionId: best.id,
      day: best.day,
      distanceM: best.distanceM!,
      durationSec: best.durationSec,
      ageDays: daysBetween(best.day, today),
      hardEffort,
    },
    predictions,
    assumptions: [
      'Recorrido llano y condiciones parecidas a las del resultado base.',
      'Entrenamiento suficiente para la distancia: Riegel no sabe si has hecho tiradas largas.',
      ...(hardEffort
        ? []
        : [
            'El resultado base no fue un esfuerzo máximo: tómalo como un mínimo de lo que puedes hacer.',
          ]),
    ],
  };
}

// ------------------------- VO2max y umbral --------------------------------

export interface MeasuredValue {
  value: number;
  heartRate: number | null;
  origin: PerfOrigin;
  sourceLabel: string | null;
  measuredOn: string;
}

export interface EstimatedValue {
  value: number;
  heartRate: number | null;
  /** Nombre del método, para poder citarlo en la app. */
  method: string;
  /** Sesión de la que sale. */
  basisSessionId: string;
  basisDay: string;
  /** Lo que hay que saber antes de fiarse del número. */
  caveats: string[];
}

export interface MeasuredOrEstimated {
  /** Último valor de test o dispositivo. Es lo que manda si existe. */
  measured: MeasuredValue | null;
  /** Estimación propia; null si no hay datos que la sostengan. */
  estimated: EstimatedValue | null;
  /** Por qué no hay estimación, cuando no la hay. */
  noEstimateReason: string | null;
}

function latestMeasured(
  measurements: PerformanceMeasurement[],
  metric: PerformanceMeasurement['metric'],
): MeasuredValue | null {
  const m = measurements
    .filter((x) => x.metric === metric)
    .sort((a, b) => (a.measuredOn < b.measuredOn ? 1 : -1))[0];
  return m
    ? {
        value: m.value,
        heartRate: m.heartRate,
        origin: m.origin,
        sourceLabel: m.sourceLabel,
        measuredOn: m.measuredOn,
      }
    : null;
}

/**
 * VO2max a partir de un resultado, con las ecuaciones de Daniels y Gilbert
 * (1979): coste de oxígeno de la velocidad dividido por la fracción del
 * máximo sostenible durante ese tiempo. `velocity` en m/min, `minutes` de duración.
 */
export function danielsVo2max(distanceM: number, durationSec: number): number {
  const minutes = durationSec / 60;
  const v = distanceM / minutes;
  const vo2 = -4.6 + 0.182258 * v + 0.000104 * v * v;
  const fraction =
    0.8 +
    0.1894393 * Math.exp(-0.012778 * minutes) +
    0.2989558 * Math.exp(-0.1932605 * minutes);
  return vo2 / fraction;
}

/** Duración válida (s) de un esfuerzo para estimar VO2max con Daniels. */
const VO2_MIN_SEC = 5 * 60;
const VO2_MAX_SEC = 150 * 60;
/** Duración (s) de un esfuerzo continuo del que se puede sacar el umbral. */
const LT_MIN_SEC = 25 * 60;
const LT_MAX_SEC = 65 * 60;
const HOUR_SEC = 3600;

function recentHardRuns(sessions: TrainingSession[], today: string) {
  return comparable(sessions, 'RUN').filter((s) => {
    const age = daysBetween(s.day, today);
    return age >= 0 && age <= PREDICTION_WINDOW_DAYS && isHardEffort(s);
  });
}

/**
 * VO2max: el medido si existe y, aparte, una estimación SOLO cuando hay un
 * esfuerzo exigente de carrera de 5 a 150 minutos en los últimos 90 días.
 * Sin eso no se estima: un rodaje suave daría un número sin sentido.
 */
export function vo2max(
  sessions: TrainingSession[],
  measurements: PerformanceMeasurement[],
  today: string,
): MeasuredOrEstimated {
  const measured = latestMeasured(measurements, 'VO2MAX');
  const efforts = recentHardRuns(sessions, today).filter(
    (s) => s.durationSec >= VO2_MIN_SEC && s.durationSec <= VO2_MAX_SEC,
  );
  if (!efforts.length) {
    return {
      measured,
      estimated: null,
      noEstimateReason:
        'Hace falta una carrera a esfuerzo alto (RPE 8 o más) de entre 5 y 150 minutos en los últimos 90 días.',
    };
  }
  const best = efforts
    .map((s) => ({ s, v: danielsVo2max(s.distanceM!, s.durationSec) }))
    .reduce((a, b) => (b.v > a.v ? b : a));
  return {
    measured,
    estimated: {
      value: round(best.v, 1),
      heartRate: null,
      method: 'Daniels-Gilbert (VDOT)',
      basisSessionId: best.s.id,
      basisDay: best.s.day,
      caveats: [
        'Es una estimación a partir de un resultado, no una medición de laboratorio.',
        'Supone que el esfuerzo fue máximo y en llano; si no, el valor real es mayor.',
      ],
    },
    noEstimateReason: null,
  };
}

/**
 * Umbral de lactato (ritmo en s/km y FC): el medido si existe y, aparte, una
 * estimación SOLO con un esfuerzo exigente y continuo de 25 a 65 minutos. El
 * ritmo se lleva a su equivalente de una hora con Riegel (el umbral es,
 * aproximadamente, lo sostenible una hora) y la FC es la media del esfuerzo.
 */
export function lactateThreshold(
  sessions: TrainingSession[],
  measurements: PerformanceMeasurement[],
  today: string,
): MeasuredOrEstimated {
  const measured = latestMeasured(measurements, 'LACTATE_THRESHOLD_PACE');
  const efforts = recentHardRuns(sessions, today).filter(
    (s) => s.durationSec >= LT_MIN_SEC && s.durationSec <= LT_MAX_SEC,
  );
  if (!efforts.length) {
    return {
      measured,
      estimated: null,
      noEstimateReason:
        'Hace falta una carrera continua a esfuerzo alto (RPE 8 o más) de entre 25 y 65 minutos en los últimos 90 días.',
    };
  }
  // Distancia equivalente en una hora: d60 = d × (3600 / t)^(1 / 1,06).
  const hourPace = (s: TrainingSession) =>
    HOUR_SEC /
    ((s.distanceM! * (HOUR_SEC / s.durationSec) ** (1 / RIEGEL_EXPONENT)) /
      1000);
  const best = efforts.reduce((a, b) => (hourPace(b) < hourPace(a) ? b : a));
  return {
    measured,
    estimated: {
      value: Math.round(hourPace(best)),
      heartRate: best.avgHeartRate,
      method: 'Esfuerzo sostenido llevado a una hora (Riegel)',
      basisSessionId: best.id,
      basisDay: best.day,
      caveats: [
        'Estimación de campo: un test de lactato puede dar un valor distinto.',
        'La FC es la media de todo el esfuerzo, incluido el arranque; el umbral real suele estar algo por encima.',
      ],
    },
    noEstimateReason: null,
  };
}

// ----------------------- Eficiencia y estancamiento ------------------------

export type CardioStatus =
  | 'PROGRESSING'
  | 'POTENTIAL_PLATEAU'
  | 'REGRESSION'
  | 'INSUFFICIENT_DATA';

export type CardioSignal =
  | 'EFFICIENCY_UP'
  | 'EFFICIENCY_DOWN'
  | 'PACE_IMPROVED'
  | 'NO_PACE_GAIN'
  | 'PACE_WORSE'
  | 'HR_UP_AT_SIMILAR_PACE'
  | 'HR_DOWN_AT_SIMILAR_PACE'
  | 'NEW_BEST_EFFORT'
  | 'NO_BEST_EFFORT_PROGRESS'
  | 'LOAD_UP_WITHOUT_GAIN'
  | 'TOO_FEW_SESSIONS'
  | 'TOO_SHORT_SPAN';

/** Ventana de análisis del rendimiento cardiovascular. */
export const CARDIO_WINDOW_DAYS = 84;
export const CARDIO_MIN_SESSIONS = 5;
export const CARDIO_MIN_SPAN_DAYS = 28;
const CARDIO_PROGRESS_PCT = 1.5;
const CARDIO_REGRESSION_PCT = -3;
/** Sesiones a ritmo «similar»: dentro de este % del ritmo mediano. */
const SIMILAR_PACE_PCT = 5;
/** Cambio de FC (ppm) a ritmo similar que se considera relevante. */
const HR_SHIFT_BPM = 3;
/** Subida de carga semanal (%) que, sin mejora, se señala. */
const LOAD_UP_PCT = 15;

export interface CardioEvidence {
  /** Con qué se mide: eficiencia (velocidad/FC) si hay FC, si no velocidad. */
  metric: 'EFFICIENCY' | 'SPEED';
  windowDays: number;
  /** Sesiones comparables usadas. */
  sessions: number;
  spanDays: number;
  /** Sesiones sin desnivel apuntado entre las usadas (terreno desconocido). */
  unknownTerrain: number;
  baselineMedian: number | null;
  recentMedian: number | null;
  changePct: number | null;
  trendPctPerWeek: number | null;
  recentSessionsBelowBaseline: number;
  /** Brío mediano (s/km) de cada mitad, para enseñarlo tal cual. */
  baselinePaceSecPerKm: number | null;
  recentPaceSecPerKm: number | null;
  /** Cambio de FC media (ppm) entre mitades en sesiones a ritmo similar. */
  hrShiftAtSimilarPace: number | null;
  /** Días desde el mejor esfuerzo (equivalente en 10K) del historial. */
  daysSinceBestEffort: number | null;
  /** Cambio (%) del tiempo semanal: últimas 4 semanas contra las 4 anteriores. */
  weeklyLoadChangePct: number | null;
}

export interface CardioPlateau {
  kind: ActivityKind;
  status: CardioStatus;
  signals: CardioSignal[];
  evidence: CardioEvidence;
}

function halves<T>(items: T[]): [T[], T[]] {
  const cut = Math.floor(items.length / 2);
  return [items.slice(0, cut), items.slice(items.length - cut)];
}

/**
 * Evolución del rendimiento en una disciplina.
 *
 * Usa solo sesiones comparables de las últimas 12 semanas y compara las
 * medianas de sus dos mitades. Con FC, la métrica es la eficiencia aeróbica
 * (metros por minuto por pulsación): mejorarla es ir más rápido a las mismas
 * pulsaciones. Sin FC, la velocidad.
 */
export function detectCardioPlateau(
  sessions: TrainingSession[],
  kind: ActivityKind,
  today: string,
): CardioPlateau {
  const ordered = [...sessions].sort(
    (a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
  );
  const all = comparable(ordered, kind);
  const window = all.filter((s) => {
    const age = daysBetween(s.day, today);
    return age >= 0 && age <= CARDIO_WINDOW_DAYS;
  });
  const withHr = window.filter((s) => s.avgHeartRate);
  const useEf = withHr.length >= CARDIO_MIN_SESSIONS;
  const used = useEf ? withHr : window;
  const speed = (s: TrainingSession) => s.distanceM! / (s.durationSec / 60);
  const valueOf = (s: TrainingSession) =>
    useEf ? speed(s) / s.avgHeartRate! : speed(s);
  const points = used.map((s) => ({ day: s.day, value: valueOf(s), s }));

  const [base, recent] = halves(points);
  const baselineMedian = median(base.map((p) => p.value));
  const recentMedian = median(recent.map((p) => p.value));
  const changePct = pctChange(baselineMedian, recentMedian);
  const trend = trendPctPerWeek(points);
  const below =
    baselineMedian === null
      ? 0
      : recent.filter((p) => p.value < baselineMedian).length;
  const pace = (items: typeof points) =>
    median(items.map((p) => paceSecPerKm(p.s)!));

  // FC a ritmo similar: solo sesiones cerca del ritmo mediano de la ventana.
  const medianPace = pace(points);
  const similar = points.filter(
    (p) =>
      p.s.avgHeartRate &&
      medianPace !== null &&
      Math.abs(paceSecPerKm(p.s)! - medianPace) / medianPace <=
        SIMILAR_PACE_PCT / 100,
  );
  const [simBase, simRecent] = halves(similar);
  const hrBase = mean(simBase.map((p) => p.s.avgHeartRate!));
  const hrRecent = mean(simRecent.map((p) => p.s.avgHeartRate!));
  const hrShift =
    similar.length >= 4 && hrBase !== null && hrRecent !== null
      ? hrRecent - hrBase
      : null;

  // Mejor esfuerzo del historial completo, en tiempo equivalente de 10K.
  let bestDay: string | null = null;
  let bestEq = Infinity;
  for (const s of all) {
    if (s.distanceM! < MIN_BASIS_M) continue;
    const eq = riegel(s.durationSec, s.distanceM!, 10000);
    if (eq < bestEq * 0.995) {
      bestEq = eq;
      bestDay = s.day;
    }
  }

  const weekSec = (from: number, to: number) =>
    sum(
      ordered
        .filter((s) => {
          const age = daysBetween(s.day, today);
          return s.kind === kind && age >= from && age < to;
        })
        .map((s) => s.durationSec),
    );
  const loadPrev = weekSec(28, 56);
  const weeklyLoadChangePct = loadPrev
    ? pctChange(loadPrev, weekSec(0, 28))
    : null;

  const spanDays = points.length
    ? daysBetween(points[0].day, points[points.length - 1].day)
    : 0;
  const r1 = (v: number | null, d = 1) => (v === null ? null : round(v, d));
  const evidence: CardioEvidence = {
    metric: useEf ? 'EFFICIENCY' : 'SPEED',
    windowDays: CARDIO_WINDOW_DAYS,
    sessions: points.length,
    spanDays,
    unknownTerrain: used.filter((s) => s.elevationGainM === null).length,
    baselineMedian: r1(baselineMedian, 3),
    recentMedian: r1(recentMedian, 3),
    changePct: r1(changePct),
    trendPctPerWeek: r1(trend, 2),
    recentSessionsBelowBaseline: below,
    baselinePaceSecPerKm: r1(pace(base), 0),
    recentPaceSecPerKm: r1(pace(recent), 0),
    hrShiftAtSimilarPace: r1(hrShift),
    daysSinceBestEffort: bestDay ? daysBetween(bestDay, today) : null,
    weeklyLoadChangePct: r1(weeklyLoadChangePct),
  };

  if (points.length < CARDIO_MIN_SESSIONS) {
    return {
      kind,
      status: 'INSUFFICIENT_DATA',
      signals: ['TOO_FEW_SESSIONS'],
      evidence,
    };
  }
  if (spanDays < CARDIO_MIN_SPAN_DAYS) {
    return {
      kind,
      status: 'INSUFFICIENT_DATA',
      signals: ['TOO_SHORT_SPAN'],
      evidence,
    };
  }

  const bestInRecent =
    bestDay !== null && recent.some((p) => p.day === bestDay);
  const secondary: CardioSignal[] = [];
  if (hrShift !== null && hrShift >= HR_SHIFT_BPM)
    secondary.push('HR_UP_AT_SIMILAR_PACE');
  if (hrShift !== null && hrShift <= -HR_SHIFT_BPM)
    secondary.push('HR_DOWN_AT_SIMILAR_PACE');
  if (!bestInRecent) secondary.push('NO_BEST_EFFORT_PROGRESS');
  const up: CardioSignal = useEf ? 'EFFICIENCY_UP' : 'PACE_IMPROVED';
  const down: CardioSignal = useEf ? 'EFFICIENCY_DOWN' : 'PACE_WORSE';

  if (
    changePct !== null &&
    changePct <= CARDIO_REGRESSION_PCT &&
    (trend ?? 0) < 0 &&
    below >= 2 &&
    !bestInRecent
  ) {
    return {
      kind,
      status: 'REGRESSION',
      signals: [down, ...secondary],
      evidence,
    };
  }
  if (
    bestInRecent ||
    (changePct !== null && changePct >= CARDIO_PROGRESS_PCT)
  ) {
    return {
      kind,
      status: 'PROGRESSING',
      signals: [
        ...(changePct !== null && changePct >= CARDIO_PROGRESS_PCT ? [up] : []),
        ...(bestInRecent ? (['NEW_BEST_EFFORT'] as const) : []),
        ...secondary,
      ],
      evidence,
    };
  }
  return {
    kind,
    status: 'POTENTIAL_PLATEAU',
    signals: [
      'NO_PACE_GAIN',
      ...secondary,
      ...(weeklyLoadChangePct !== null && weeklyLoadChangePct >= LOAD_UP_PCT
        ? (['LOAD_UP_WITHOUT_GAIN'] as const)
        : []),
    ],
    evidence,
  };
}

// ------------------------------- Resumen ----------------------------------

export interface KindSummary {
  kind: ActivityKind;
  sessions: number;
  distanceM: number;
  durationSec: number;
  elevationGainM: number;
  /** Brío medio ponderado por distancia (s/km), solo sesiones con distancia. */
  avgPaceSecPerKm: number | null;
  avgSpeedKmh: number | null;
  avgHeartRate: number | null;
  /** FC más alta registrada en el periodo. */
  peakHeartRate: number | null;
  avgCadence: number | null;
  avgRpe: number | null;
  longestDistanceM: number | null;
  longestDurationSec: number;
  lastDay: string | null;
}

export interface CardioDataQuality {
  sessions: number;
  withDistance: number;
  withHeartRate: number;
  withZoneBreakdown: number;
  withRpe: number;
  withElevation: number;
}

export interface CardioAnalysis {
  periodDays: number | null;
  zones: HeartZone[] | null;
  timeInZones: TimeInZones;
  byKind: KindSummary[];
  /** Evolución por disciplina (solo las que tienen sesiones). */
  plateaus: CardioPlateau[];
  predictions: PredictionSet | null;
  vo2max: MeasuredOrEstimated;
  lactateThreshold: MeasuredOrEstimated;
  dataQuality: CardioDataQuality;
}

export interface CardioOptions {
  today: string;
  /** Días del periodo del resumen; null = todo el historial. */
  periodDays: number | null;
}

function summarize(kind: ActivityKind, items: TrainingSession[]): KindSummary {
  const withDist = items.filter((s) => s.distanceM);
  const dist = sum(withDist.map((s) => s.distanceM!));
  const distTime = sum(withDist.map((s) => s.durationSec));
  const avg = (values: (number | null)[], d = 0) => {
    const m = mean(values.flatMap((v) => (v === null ? [] : [v])));
    return m === null ? null : round(m, d);
  };
  return {
    kind,
    sessions: items.length,
    distanceM: dist,
    durationSec: sum(items.map((s) => s.durationSec)),
    elevationGainM: sum(items.map((s) => s.elevationGainM ?? 0)),
    avgPaceSecPerKm: dist ? Math.round(distTime / (dist / 1000)) : null,
    avgSpeedKmh: dist ? round(dist / 1000 / (distTime / 3600), 1) : null,
    avgHeartRate: avg(items.map((s) => s.avgHeartRate)),
    peakHeartRate: items.reduce<number | null>(
      (m, s) =>
        s.maxHeartRate && s.maxHeartRate > (m ?? 0) ? s.maxHeartRate : m,
      null,
    ),
    avgCadence: avg(items.map((s) => s.cadence)),
    avgRpe: avg(
      items.map((s) => s.rpe),
      1,
    ),
    longestDistanceM: withDist.length
      ? Math.max(...withDist.map((s) => s.distanceM!))
      : null,
    longestDurationSec: Math.max(0, ...items.map((s) => s.durationSec)),
    lastDay: items.reduce<string | null>(
      (d, s) => (d === null || s.day > d ? s.day : d),
      null,
    ),
  };
}

/**
 * Análisis cardiovascular completo. `sessions` es TODO el historial (las
 * predicciones y la evolución usan sus propias ventanas); `periodDays` solo
 * acota el resumen por disciplina y el tiempo en zonas.
 */
export function analyzeCardio(
  sessions: TrainingSession[],
  heartConfig: HeartConfig | null,
  measurements: PerformanceMeasurement[],
  options: CardioOptions,
): CardioAnalysis {
  const { today, periodDays } = options;
  const cardio = sessions.filter((s) => isCardio(s.kind));
  const inPeriod = cardio.filter((s) => {
    const age = daysBetween(s.day, today);
    return age >= 0 && (periodDays === null || age < periodDays);
  });
  const zones = heartZones(heartConfig);
  const kinds = CARDIO_KINDS.filter((k) => cardio.some((s) => s.kind === k));

  return {
    periodDays,
    zones,
    timeInZones: timeInZones(cardio, zones, today, periodDays ?? 36500),
    byKind: kinds
      .map((k) =>
        summarize(
          k,
          inPeriod.filter((s) => s.kind === k),
        ),
      )
      .filter((k) => k.sessions > 0),
    plateaus: kinds.map((k) => detectCardioPlateau(cardio, k, today)),
    predictions: predictRaces(cardio, today),
    vo2max: vo2max(cardio, measurements, today),
    lactateThreshold: lactateThreshold(cardio, measurements, today),
    dataQuality: {
      sessions: inPeriod.length,
      withDistance: inPeriod.filter((s) => s.distanceM).length,
      withHeartRate: inPeriod.filter((s) => s.avgHeartRate).length,
      withZoneBreakdown: inPeriod.filter((s) => s.zoneSeconds).length,
      withRpe: inPeriod.filter((s) => s.rpe !== null).length,
      withElevation: inPeriod.filter((s) => s.elevationGainM !== null).length,
    },
  };
}
