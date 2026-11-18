import type { ActivitySession, LogActivityBody } from '../api';

/** Una serie tal y como se teclea: todo texto hasta guardar. */
export interface DraftSet {
  weight: string;
  reps: string;
  rir: string;
  /** Calentamiento: no cuenta para volumen ni marcas. */
  warmup: boolean;
  /** Solo en vivo: la serie ya se ha hecho (✓). Nunca viaja a la API. */
  done?: boolean;
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

/** Kilos levantados en las series de trabajo completas (peso × reps). */
export function exerciseVolume(ex: DraftExercise): number {
  return ex.sets.reduce((sum, s) => {
    if (s.warmup) return sum;
    const w = num(s.weight) ?? (ex.bodyweight ? 0 : null);
    const r = num(s.reps);
    return w !== null && r !== null && r > 0 ? sum + w * r : sum;
  }, 0);
}

/**
 * Al terminar en vivo se guardan las series marcadas como hechas. Si no se
 * marcó ninguna en todo el entreno (se usó como un formulario), se respeta
 * todo lo apuntado. Las marcas `done` se quitan: son solo de la pantalla.
 */
export function finishLiveDrafts(drafts: DraftExercise[]): DraftExercise[] {
  const anyDone = drafts.some((e) => e.sets.some((s) => s.done));
  return drafts
    .map((e) => ({
      ...e,
      sets: (anyDone ? e.sets.filter((s) => s.done) : e.sets).map((s) => ({ weight: s.weight, reps: s.reps, rir: s.rir, warmup: s.warmup })),
    }))
    .filter((e) => e.sets.length > 0);
}

/** En vivo: todas sus series marcadas como hechas (y al menos una). */
export function isExerciseDone(ex: DraftExercise): boolean {
  return ex.sets.length > 0 && ex.sets.every((s) => s.done);
}

/** La serie de trabajo hecha más pesada (a igual peso, más reps), como "72,5 × 8". */
export function bestSetLabel(ex: DraftExercise): string | null {
  let best: { weightKg: number; reps: number } | null = null;
  for (const s of ex.sets) {
    if (s.warmup || !s.done) continue;
    const w = num(s.weight) ?? (ex.bodyweight ? 0 : null);
    const r = num(s.reps);
    if (w === null || r === null || r < 1) continue;
    if (!best || w > best.weightKg || (w === best.weightKg && r > best.reps)) best = { weightKg: w, reps: r };
  }
  return best ? setLabel(best, ex.bodyweight) : null;
}

/** "80 × 8" de una serie guardada, con coma decimal. */
export function setLabel(s: { weightKg: number; reps: number }, bodyweight: boolean): string {
  if (bodyweight && s.weightKg === 0) return `${s.reps} reps`;
  return `${text(s.weightKg)} × ${s.reps}`;
}

/** Cronómetro: "4:05" o "1:02:09". */
export function clock(totalSec: number): string {
  const t = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

/** Valor de la serie anterior para precargar un campo vacío. */
export function previousAsDraft(s: { weightKg: number; reps: number; rir: number | null }): Pick<DraftSet, 'weight' | 'reps' | 'rir'> {
  return { weight: text(s.weightKg), reps: String(s.reps), rir: s.rir === null ? '' : String(s.rir) };
}

/** Campos de cardio de una edición: `null` quita el dato. */
export interface CardioPatch {
  distanceM: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  elevationGainM: number | null;
  cadence: number | null;
  zoneSeconds: number[] | null;
}

/**
 * Para editar: lo relleno se manda y lo vacío va como `null`, que en la API
 * significa «quitar el dato» (al registrar, lo vacío simplemente no se manda).
 */
export function cardioPatch(c: DraftCardio): CardioPatch {
  const f = cardioBody(c);
  return {
    distanceM: f.distanceM ?? null,
    avgHeartRate: f.avgHeartRate ?? null,
    maxHeartRate: f.maxHeartRate ?? null,
    elevationGainM: f.elevationGainM ?? null,
    cadence: f.cadence ?? null,
    zoneSeconds: f.zoneSeconds ?? null,
  };
}

/** Datos de cardio guardados → borrador editable. */
export function cardioDraftFromSession(s: ActivitySession): DraftCardio {
  const n = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(v));
  return {
    distanceKm: s.distanceM ? text(Math.round(s.distanceM / 10) / 100) : '',
    avgHr: n(s.avgHeartRate),
    maxHr: n(s.maxHeartRate),
    elevation: n(s.elevationGainM),
    cadence: n(s.cadence),
    zones: s.zoneSeconds?.length === 5 ? s.zoneSeconds.map((z) => (z ? text(Math.round((z / 60) * 10) / 10) : '')) : ['', '', '', '', ''],
  };
}

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
