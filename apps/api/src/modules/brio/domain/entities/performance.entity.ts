// Datos de entrada de los motores de rendimiento (Athlete Performance Engine).
// Son tipos puros: los motores reciben esto y no saben nada de Prisma ni HTTP.

export const MUSCLES = [
  'CHEST',
  'LATS',
  'TRAPS',
  'FRONT_DELT',
  'SIDE_DELT',
  'REAR_DELT',
  'BICEPS',
  'TRICEPS',
  'FOREARMS',
  'QUADS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'ABS',
  'LOWER_BACK',
] as const;
export type Muscle = (typeof MUSCLES)[number];

/** Músculos del tren inferior, para cruzar fuerza con carrera y bici. */
export const LOWER_BODY_MUSCLES: readonly Muscle[] = [
  'QUADS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
];

export const ACTIVITY_KINDS = [
  'STRENGTH',
  'RUN',
  'CYCLE',
  'WALK',
  'HIKE',
  'SWIM',
  'ELLIPTICAL',
  'OTHER_CARDIO',
  'OTHER',
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const CARDIO_KINDS: readonly ActivityKind[] = [
  'RUN',
  'CYCLE',
  'WALK',
  'HIKE',
  'SWIM',
  'ELLIPTICAL',
  'OTHER_CARDIO',
];

/** Participación de un músculo en un ejercicio: 1.0, 0.5 o 0.25 (configurable). */
export interface MuscleWeight {
  muscle: Muscle;
  weight: number;
}

export interface Exercise {
  id: string;
  code: string | null;
  name: string;
  isCompound: boolean;
  isBodyweight: boolean;
  ownerUserId: string | null;
  muscles: MuscleWeight[];
  /** true si el usuario ha cambiado los pesos por músculo de un ejercicio del catálogo. */
  customized: boolean;
}

export interface StrengthSet {
  exerciseId: string;
  exerciseOrder: number;
  setOrder: number;
  /** Carga externa en kg (0 = solo peso corporal). */
  weightKg: number;
  reps: number;
  /** Repeticiones en reserva; null = no apuntado. */
  rir: number | null;
  restSec: number | null;
  isWarmup: boolean;
}

export type ZoneMethod = 'MAX_HR' | 'HR_RESERVE' | 'CUSTOM';

export interface HeartConfig {
  maxHr: number | null;
  restingHr: number | null;
  method: ZoneMethod;
  /** Límite superior en ppm de Z1..Z4. Solo con `CUSTOM`. */
  customZones: number[] | null;
}

export type PerfMetric = 'VO2MAX' | 'LACTATE_THRESHOLD_PACE';
export type PerfOrigin = 'LAB_TEST' | 'DEVICE' | 'FIELD_TEST';

/** Valor que el usuario trae de fuera (test o dispositivo). Nunca una estimación nuestra. */
export interface PerformanceMeasurement {
  id: string;
  metric: PerfMetric;
  value: number;
  heartRate: number | null;
  origin: PerfOrigin;
  sourceLabel: string | null;
  measuredOn: string;
}

/** Una sesión tal y como la ven los motores: fuerza y cardio con el mismo tipo. */
export interface TrainingSession {
  id: string;
  startedAt: Date;
  /** Día natural (`YYYY-MM-DD`) en la zona horaria del usuario. */
  day: string;
  kind: ActivityKind;
  activityCode: string | null;
  durationSec: number;
  distanceM: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  elevationGainM: number | null;
  cadence: number | null;
  /** Esfuerzo percibido CR10 (1–10). */
  rpe: number | null;
  /** Esfuerzo simplificado del registro rápido; sirve de respaldo si no hay RPE. */
  effort: 'LIGHT' | 'MODERATE' | 'VIGOROUS' | null;
  /** Segundos en Z1..Z5 si el dispositivo los dio. */
  zoneSeconds: number[] | null;
  sets: StrengthSet[];
}
