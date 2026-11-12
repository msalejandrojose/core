import type { LogActivityBody } from '../api';

/** Una serie tal y como se teclea: todo texto hasta guardar. */
export interface DraftSet {
  weight: string;
  reps: string;
  rir: string;
}
export interface DraftExercise {
  exerciseId: string;
  name: string;
  bodyweight: boolean;
  sets: DraftSet[];
}
export interface DraftCardio {
  distanceKm: string;
  avgHr: string;
  maxHr: string;
  elevation: string;
}

export const EMPTY_CARDIO: DraftCardio = { distanceKm: '', avgHr: '', maxHr: '', elevation: '' };

const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() !== '' && Number.isFinite(n) ? n : null;
};

/** Series válidas para la API: las incompletas se descartan sin avisar. */
export function exercisesBody(drafts: DraftExercise[]): LogActivityBody['exercises'] {
  return drafts
    .map((d) => ({
      exerciseId: d.exerciseId,
      sets: d.sets.flatMap((s) => {
        const reps = num(s.reps);
        const weight = num(s.weight) ?? (d.bodyweight ? 0 : null);
        const rir = num(s.rir);
        if (reps === null || reps < 1 || weight === null || weight < 0) return [];
        return [
          {
            weightKg: Math.round(weight * 100) / 100,
            reps: Math.round(reps),
            ...(rir !== null && rir >= 0 && rir <= 10 ? { rir: Math.round(rir) } : {}),
          },
        ];
      }),
    }))
    .filter((e) => e.sets.length > 0);
}

/** Campos de cardio rellenados, ya en las unidades de la API. */
export function cardioBody(c: DraftCardio): Partial<LogActivityBody> {
  const km = num(c.distanceKm);
  const avg = num(c.avgHr);
  const max = num(c.maxHr);
  const up = num(c.elevation);
  return {
    ...(km !== null && km > 0 ? { distanceM: Math.round(km * 1000) } : {}),
    ...(avg !== null && avg >= 30 && avg <= 250 ? { avgHeartRate: Math.round(avg) } : {}),
    ...(max !== null && max >= 30 && max <= 250 ? { maxHeartRate: Math.round(max) } : {}),
    ...(up !== null && up >= 0 ? { elevationGainM: Math.round(up) } : {}),
  };
}
