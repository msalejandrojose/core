import type { ActivitySession, LogActivityBody } from '../api';

/** Una serie tal y como se teclea: todo texto hasta guardar. */
export interface DraftSet {
  weight: string;
  reps: string;
  rir: string;
  /** Calentamiento: no cuenta para volumen ni marcas. */
  warmup: boolean;
}
export interface DraftExercise {
  exerciseId: string;
  name: string;
  bodyweight: boolean;
  /** Descanso entre series, en segundos (vacío = sin apuntar). */
  rest: string;
  sets: DraftSet[];
}
export interface DraftCardio {
  distanceKm: string;
  avgHr: string;
  maxHr: string;
  elevation: string;
  cadence: string;
  /** Minutos en cada zona, Z1 a Z5. */
  zones: string[];
}

export const EMPTY_SET: DraftSet = { weight: '', reps: '', rir: '', warmup: false };
export const EMPTY_CARDIO: DraftCardio = {
  distanceKm: '',
  avgHr: '',
  maxHr: '',
  elevation: '',
  cadence: '',
  zones: ['', '', '', '', ''],
};

const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() !== '' && Number.isFinite(n) ? n : null;
};

/** Series válidas para la API: las incompletas se descartan sin avisar. */
export function exercisesBody(drafts: DraftExercise[]): NonNullable<LogActivityBody['exercises']> {
  return drafts
    .map((d) => {
      const rest = num(d.rest);
      const restSec = rest !== null && rest >= 0 && rest <= 3600 ? Math.round(rest) : null;
      let first = true;
      return {
        exerciseId: d.exerciseId,
        sets: d.sets.flatMap((s) => {
          const reps = num(s.reps);
          const weight = num(s.weight) ?? (d.bodyweight ? 0 : null);
          const rir = num(s.rir);
          if (reps === null || reps < 1 || weight === null || weight < 0) return [];
          // El descanso es el de antes de la serie: la primera no lo lleva.
          const withRest = !first && restSec !== null;
          first = false;
          return [
            {
              weightKg: Math.round(weight * 100) / 100,
              reps: Math.round(reps),
              ...(rir !== null && rir >= 0 && rir <= 10 ? { rir: Math.round(rir) } : {}),
              ...(withRest ? { restSec } : {}),
              ...(s.warmup ? { isWarmup: true } : {}),
            },
          ];
        }),
      };
    })
    .filter((e) => e.sets.length > 0);
}

/** Campos de cardio rellenados, ya en las unidades de la API. */
export function cardioBody(c: DraftCardio): Partial<LogActivityBody> {
  const km = num(c.distanceKm);
  const avg = num(c.avgHr);
  const max = num(c.maxHr);
  const up = num(c.elevation);
  const cad = num(c.cadence);
  const zones = c.zones.map((z) => num(z));
  // El tiempo por zona solo se manda si hay alguna zona rellena; las vacías son 0.
  const anyZone = zones.some((z) => z !== null && z > 0);
  return {
    ...(km !== null && km > 0 ? { distanceM: Math.round(km * 1000) } : {}),
    ...(avg !== null && avg >= 30 && avg <= 250 ? { avgHeartRate: Math.round(avg) } : {}),
    ...(max !== null && max >= 30 && max <= 250 ? { maxHeartRate: Math.round(max) } : {}),
    ...(up !== null && up >= 0 ? { elevationGainM: Math.round(up) } : {}),
    ...(cad !== null && cad >= 1 && cad <= 300 ? { cadence: Math.round(cad) } : {}),
    ...(anyZone ? { zoneSeconds: zones.map((z) => Math.round(Math.max(0, z ?? 0) * 60)) } : {}),
  };
}

const text = (n: number) => String(n).replace('.', ',');

/** Series guardadas → borrador editable, agrupadas por ejercicio y en su orden. */
export function draftsFromSets(
  sets: NonNullable<ActivitySession['sets']>,
  catalog: { id: string; name: string; isBodyweight: boolean }[],
): DraftExercise[] {
  const byId = new Map(catalog.map((e) => [e.id, e]));
  const groups = new Map<number, typeof sets>();
  for (const s of sets) groups.set(s.exerciseOrder, [...(groups.get(s.exerciseOrder) ?? []), s]);
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, group]) => {
      const ordered = [...group].sort((a, b) => a.setOrder - b.setOrder);
      const ex = byId.get(ordered[0].exerciseId);
      const rest = ordered.find((s) => s.restSec !== null)?.restSec ?? null;
      return {
        exerciseId: ordered[0].exerciseId,
        name: ex?.name ?? 'Ejercicio',
        bodyweight: ex?.isBodyweight ?? false,
        rest: rest === null ? '' : String(rest),
        sets: ordered.map((s) => ({
          weight: text(s.weightKg),
          reps: String(s.reps),
          rir: s.rir === null ? '' : String(s.rir),
          warmup: s.isWarmup,
        })),
      };
    });
}
