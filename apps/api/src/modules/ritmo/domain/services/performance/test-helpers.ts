// Constructores de datos para los tests de los motores de rendimiento.
import type {
  ActivityKind,
  Exercise,
  Muscle,
  StrengthSet,
  TrainingSession,
} from '../../entities/performance.entity';

export function exercise(
  id: string,
  muscles: [Muscle, number][],
  opts: { bodyweight?: boolean } = {},
): Exercise {
  return {
    id,
    code: id,
    name: id,
    isCompound: muscles.length > 1,
    isBodyweight: opts.bodyweight ?? false,
    ownerUserId: null,
    customized: false,
    muscles: muscles.map(([muscle, weight]) => ({ muscle, weight })),
  };
}

/** `sets('bench', [[70, 8, 2], [70, 8]])` → series de trabajo (peso, reps, RIR). */
export function sets(
  exerciseId: string,
  rows: [number, number, (number | null)?][],
  opts: { warmup?: boolean; exerciseOrder?: number } = {},
): StrengthSet[] {
  return rows.map(([weightKg, reps, rir], setOrder) => ({
    exerciseId,
    exerciseOrder: opts.exerciseOrder ?? 0,
    setOrder,
    weightKg,
    reps,
    rir: rir ?? null,
    restSec: null,
    isWarmup: opts.warmup ?? false,
  }));
}

let seq = 0;
export function session(
  day: string,
  data: Partial<TrainingSession> & { kind?: ActivityKind } = {},
): TrainingSession {
  seq += 1;
  return {
    id: `s${seq}`,
    startedAt: new Date(`${day}T07:00:00.000Z`),
    day,
    kind: 'STRENGTH',
    activityCode: null,
    durationSec: 3600,
    distanceM: null,
    avgHeartRate: null,
    maxHeartRate: null,
    elevationGainM: null,
    cadence: null,
    rpe: null,
    effort: null,
    zoneSeconds: null,
    sets: [],
    ...data,
  };
}
