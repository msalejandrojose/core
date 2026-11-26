import type { LogActivityBody } from '../api';
import type { Routine, SaveRoutineBody } from '../routines/routines.api';
import { closesRound, normalizeGroups, toggleLink } from '../routines/supersets';
import { formatDistance, formatTime, parseTime } from '../routines/measures';
import { setsOf } from '../routines/routine-draft';
import type { Measure } from '../performance/perf.api';

/**
 * Entreno de gimnasio hecho en Brío, serie a serie. Todo es puro: la pantalla
 * guarda el estado (y lo persiste para no perderlo si se cierra la app) y aquí
 * se decide cómo cambia y cómo se convierte en un entreno para la API.
 */

export interface LiveSet {
  weight: string;
  reps: string;
  /** Metros, tiempo («4:05») y calorías, para lo que no va por repeticiones. */
  distance: string;
  time: string;
  cal: string;
  /** Repeticiones en reserva (texto, como el resto); vacío si no se apunta. */
  rir?: string;
  /** Calentamiento: no lleva número, ni cuenta para el volumen ni para el peso de la rutina. */
  warmup?: boolean;
  done: boolean;
}

export interface PreviousSets {
  exerciseId: string;
  day: string;
  sets: {
    weightKg: number;
    reps: number;
    distanceM?: number | null;
    durationSec?: number | null;
    calories?: number | null;
  }[];
}

export interface LiveExercise {
  exerciseId: string;
  name: string;
  bodyweight: boolean;
  /** Cómo se mide: repeticiones, metros, tiempo o calorías. */
  measure: Measure;
  /** Músculos principales, en texto. */
  muscles: string;
  restSec: number | null;
  /** Superserie: mismo número que el ejercicio de al lado. */
  group: number | null;
  sets: LiveSet[];
  previous: PreviousSets | null;
}

export interface LiveWorkout {
  routineId: string | null;
  name: string;
  startedAt: number;
  exercises: LiveExercise[];
  /** Fin del descanso en curso (ms) y cuánto dura, para la barra. */
  restUntil: number | null;
  restFor: number | null;
  /** Ejercicio en el que estás (lo usa la Live Activity); si falta, el primero pendiente. */
  focus?: number;
}

const fmt = (n: number) => String(n).replace('.', ',');
const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() !== '' && Number.isFinite(n) ? n : null;
};

/** Empieza un entreno con las series de la rutina; el peso, el de la rutina o el de la última vez. */
export function startFromRoutine(
  r: Routine,
  previous: PreviousSets[],
  muscleName: (m: string) => string,
  now = Date.now(),
): LiveWorkout {
  return {
    routineId: r.id,
    name: r.name,
    startedAt: now,
    restUntil: null,
    restFor: null,
    exercises: r.exercises.map((e) => {
      const prev = previous.find((p) => p.exerciseId === e.exerciseId) ?? null;
      const prevTop = prev?.sets.length ? Math.max(...prev.sets.map((s) => s.weightKg)) : null;
      const weight = e.weightKg ?? (prevTop && prevTop > 0 ? prevTop : null);
      return {
        exerciseId: e.exerciseId,
        name: e.name,
        bodyweight: e.isBodyweight ?? false,
        measure: e.measure ?? 'REPS',
        muscles: e.muscles
          .filter((m) => m.weight >= 1)
          .map((m) => muscleName(m.muscle))
          .join(', '),
        restSec: e.restSec,
        group: e.supersetGroup,
        previous: prev,
        // Cada serie con lo suyo (pirámides…); sin peso previsto, el de la última vez.
        sets: setsOf(e).map((p) => ({
          weight: p.weightKg ? fmt(p.weightKg) : weight !== null ? fmt(weight) : '',
          reps: String(p.reps),
          distance: e.distanceM ? String(e.distanceM) : '',
          time: formatTime(e.durationSec),
          cal: e.calories ? String(e.calories) : '',
          done: false,
        })),
      };
    }),
  };
}

/** Entreno libre (sin rutina): se van añadiendo ejercicios. */
export const emptyWorkout = (name = 'Entreno de fuerza', now = Date.now()): LiveWorkout => ({
  routineId: null,
  name,
  startedAt: now,
  restUntil: null,
  restFor: null,
  exercises: [],
});

const mapExercise = (w: LiveWorkout, i: number, f: (e: LiveExercise) => LiveExercise): LiveWorkout => ({
  ...w,
  exercises: w.exercises.map((e, j) => (j === i ? f(e) : e)),
});

export const EMPTY_LIVE_SET: LiveSet = { weight: '', reps: '', distance: '', time: '', cal: '', done: false };

export function editSet(w: LiveWorkout, i: number, k: number, changes: Partial<Omit<LiveSet, 'done'>>): LiveWorkout {
  return mapExercise(w, i, (e) => ({ ...e, sets: e.sets.map((s, y) => (y === k ? { ...s, ...changes } : s)) }));
}

/**
 * Marca (o desmarca) una serie. Al marcarla empieza el descanso del ejercicio
 * y, si las siguientes series no tienen peso, heredan el de esta.
 */
export function toggleSet(w: LiveWorkout, i: number, k: number, now = Date.now()): LiveWorkout {
  const ex = w.exercises[i];
  const set = ex?.sets[k];
  if (!set) return w;
  const done = !set.done;
  const next = mapExercise(w, i, (e) => ({
    ...e,
    sets: e.sets.map((s, y) => {
      if (y === k) return { ...s, done };
      // El peso del calentamiento no se arrastra a las series de trabajo.
      if (done && !set.warmup && y > k && !s.done && !s.warmup && !s.weight.trim()) return { ...s, weight: set.weight };
      return s;
    }),
  }));
  // En superserie se descansa al cerrar la vuelta (último ejercicio del grupo).
  const groups = w.exercises.map((e) => e.group);
  const rest = done && closesRound(groups, i) && ex.restSec ? ex.restSec : null;
  return {
    ...next,
    // Marcar una serie te sitúa en ese ejercicio.
    focus: done ? i : w.focus,
    restUntil: rest ? now + rest * 1000 : done ? null : w.restUntil,
    restFor: rest ?? (done ? null : w.restFor),
  };
}

export function addSet(w: LiveWorkout, i: number): LiveWorkout {
  return mapExercise(w, i, (e) => {
    const last = e.sets[e.sets.length - 1];
    return { ...e, sets: [...e.sets, { ...EMPTY_LIVE_SET, ...(last ?? {}), rir: '', warmup: false, done: false }] };
  });
}

/** Marca (o desmarca) una serie como calentamiento. */
export function toggleWarmup(w: LiveWorkout, i: number, k: number): LiveWorkout {
  return mapExercise(w, i, (e) => ({ ...e, sets: e.sets.map((s, y) => (y === k ? { ...s, warmup: !s.warmup } : s)) }));
}

/** Quita la última serie si aún no está hecha (y queda al menos una). */
export function removeLastSet(w: LiveWorkout, i: number): LiveWorkout {
  const e = w.exercises[i];
  if (!e || e.sets.length < 2 || e.sets[e.sets.length - 1].done) return w;
  return removeSet(w, i, e.sets.length - 1);
}

/** Número de la serie entre las de trabajo (las de calentamiento no cuentan); null si es calentamiento. */
export function workNumber(e: LiveExercise, k: number): number | null {
  if (e.sets[k]?.warmup) return null;
  return e.sets.slice(0, k + 1).filter((s) => !s.warmup).length;
}

export function removeSet(w: LiveWorkout, i: number, k: number): LiveWorkout {
  return mapExercise(w, i, (e) => (e.sets.length > 1 ? { ...e, sets: e.sets.filter((_, y) => y !== k) } : e));
}

export function addExercise(
  w: LiveWorkout,
  e: Omit<LiveExercise, 'sets' | 'previous' | 'group'>,
  previous: PreviousSets | null,
): LiveWorkout {
  const top = previous?.sets.length ? Math.max(...previous.sets.map((s) => s.weightKg)) : null;
  const first = previous?.sets[0];
  const reps = first?.reps || 10;
  return {
    ...w,
    exercises: [
      ...w.exercises,
      {
        ...e,
        group: null,
        previous,
        sets: Array.from({ length: e.measure === 'REPS' ? 3 : 1 }, () => ({
          ...EMPTY_LIVE_SET,
          weight: top ? fmt(top) : '',
          reps: String(reps),
          distance: first?.distanceM ? String(first.distanceM) : e.measure === 'DISTANCE' ? '1000' : '',
          time: e.measure === 'TIME' ? formatTime(first?.durationSec) || '1:00' : '',
          cal: first?.calories ? String(first.calories) : e.measure === 'CALORIES' ? '15' : '',
        })),
      },
    ],
  };
}

const regroup = (exs: LiveExercise[], gs: (number | null)[]) => exs.map((e, k) => ({ ...e, group: gs[k] }));

export function removeExercise(w: LiveWorkout, i: number): LiveWorkout {
  const exs = w.exercises.filter((_, j) => j !== i);
  return { ...w, exercises: regroup(exs, normalizeGroups(exs.map((e) => e.group))) };
}

/** Une con el siguiente en superserie (o los separa) sobre la marcha. */
export function linkWithNext(w: LiveWorkout, i: number): LiveWorkout {
  return { ...w, exercises: regroup(w.exercises, toggleLink(w.exercises.map((e) => e.group), i)) };
}

/** Cambia el descanso del ejercicio (en superserie, el que cuenta es el del último). */
export function setRest(w: LiveWorkout, i: number, sec: number): LiveWorkout {
  return mapExercise(w, i, (e) => ({ ...e, restSec: sec > 0 ? sec : null }));
}

export const skipRest = (w: LiveWorkout): LiveWorkout => ({ ...w, restUntil: null, restFor: null });

export function addRest(w: LiveWorkout, sec: number, now = Date.now()): LiveWorkout {
  if (!w.restUntil) return w;
  return { ...w, restUntil: Math.max(now, w.restUntil) + sec * 1000, restFor: (w.restFor ?? 0) + sec };
}

interface DoneSet {
  weightKg: number;
  reps: number;
  distanceM?: number;
  durationSec?: number;
  calories?: number;
  rir?: number;
  isWarmup?: boolean;
}

/** Series válidas hechas, según cómo se mide el ejercicio. */
function doneSets(e: LiveExercise): DoneSet[] {
  return e.sets.flatMap((s): DoneSet[] => {
    if (!s.done) return [];
    const weight = Math.round((num(s.weight) ?? 0) * 100) / 100;
    if (weight < 0) return [];
    const time = parseTime(s.time);
    const rir = num(s.rir ?? '');
    const tags = {
      ...(s.warmup ? { isWarmup: true } : {}),
      ...(rir !== null && rir >= 0 ? { rir: Math.min(10, Math.round(rir)) } : {}),
    };
    const extra = { ...(time ? { durationSec: time } : {}), ...tags };
    switch (e.measure) {
      case 'DISTANCE': {
        const m = num(s.distance);
        return m && m > 0 ? [{ weightKg: weight, reps: 0, distanceM: Math.round(m), ...extra }] : [];
      }
      case 'TIME':
        return time ? [{ weightKg: weight, reps: 0, durationSec: time, ...tags }] : [];
      case 'CALORIES': {
        const c = num(s.cal);
        return c && c > 0 ? [{ weightKg: weight, reps: 0, calories: Math.round(c), ...extra }] : [];
      }
      default: {
        const reps = num(s.reps);
        return reps !== null && reps >= 1 ? [{ weightKg: weight, reps: Math.round(reps), ...tags }] : [];
      }
    }
  });
}

/** Lleva algo que no va por repeticiones (carrera, remo, trineo…): entreno híbrido. */
export const isHybrid = (w: LiveWorkout) => w.exercises.some((e) => e.measure !== 'REPS');

export function progress(w: LiveWorkout): { done: number; total: number; volumeKg: number; distanceM: number } {
  let done = 0;
  let total = 0;
  let volumeKg = 0;
  let distanceM = 0;
  for (const e of w.exercises) {
    total += e.sets.length;
    for (const s of doneSets(e)) {
      done += 1;
      if (!s.isWarmup) volumeKg += s.weightKg * s.reps;
      distanceM += s.distanceM ?? 0;
    }
  }
  return { done, total, volumeKg: Math.round(volumeKg), distanceM };
}

/** Entreno para `POST /brio/activities`: solo las series marcadas como hechas. */
export function toLogBody(
  w: LiveWorkout,
  activityTypeId: string,
  effort: NonNullable<LogActivityBody['effort']>,
  now = Date.now(),
): LogActivityBody {
  const exercises = w.exercises
    .map((e) => ({
      exerciseId: e.exerciseId,
      sets: doneSets(e).map((s, k) => ({
        ...s,
        ...(k > 0 && e.restSec ? { restSec: e.restSec } : {}),
      })),
    }))
    .filter((e) => e.sets.length);
  return {
    activityTypeId,
    startedAt: new Date(w.startedAt).toISOString(),
    durationSec: Math.max(60, Math.round((now - w.startedAt) / 1000)),
    effort,
    ...(w.routineId ? { routineId: w.routineId } : {}),
    ...(exercises.length ? { exercises } : {}),
  };
}

/**
 * La rutina con los pesos de hoy: para cada ejercicio de la rutina, el mayor
 * peso de las series hechas (si se hizo). El resto se queda igual.
 */
export function routineWithTodayWeights(r: Routine, w: LiveWorkout): SaveRoutineBody {
  return {
    name: r.name,
    kind: r.kind,
    notes: r.notes,
    plannedDurationMin: r.plannedDurationMin,
    exercises: r.exercises.map((e) => {
      const live = w.exercises.find((x) => x.exerciseId === e.exerciseId);
      const sets = live ? doneSets(live).filter((s) => !s.isWarmup) : [];
      const top = sets.length ? Math.max(...sets.map((s) => s.weightKg)) : null;
      // Con series distintas, cada una se queda con el peso que moviste en ella.
      const setPlan = e.setPlan?.length
        ? e.setPlan.map((p, k) => ({ reps: p.reps, weightKg: sets[k] && sets[k].weightKg > 0 ? sets[k].weightKg : p.weightKg }))
        : null;
      return {
        exerciseId: e.exerciseId,
        sets: e.sets,
        reps: e.reps,
        weightKg: top && top > 0 ? top : e.weightKg,
        ...(setPlan ? { setPlan } : {}),
        // Si cambiaste el descanso entrenando, se queda el de hoy.
        restSec: live ? live.restSec : e.restSec,
        supersetGroup: e.supersetGroup,
        distanceM: e.distanceM,
        durationSec: e.durationSec,
        calories: e.calories,
      };
    }),
  };
}

/** «La última vez: 70 kg × 8, 8, 7», «1 km en 4:05», «15 cal en 0:52». */
export function previousLine(p: PreviousSets | null, measure: Measure = 'REPS'): string | null {
  if (!p?.sets.length) return null;
  if (measure !== 'REPS') {
    const parts = p.sets.map((s) => {
      const what =
        measure === 'DISTANCE' ? formatDistance(s.distanceM) : measure === 'CALORIES' ? (s.calories ? `${s.calories} cal` : '') : '';
      const time = formatTime(s.durationSec);
      return [what, time && (what ? `en ${time}` : time)].filter(Boolean).join(' ');
    });
    const kg = p.sets[0].weightKg ? ` · ${fmt(p.sets[0].weightKg)} kg` : '';
    const text = parts.filter(Boolean).join(', ');
    return text ? `La última vez: ${text}${kg}` : null;
  }
  const same = p.sets.every((s) => s.weightKg === p.sets[0].weightKg);
  if (same) {
    const w = p.sets[0].weightKg;
    return `La última vez: ${w ? `${fmt(w)} kg × ` : ''}${p.sets.map((s) => s.reps).join(', ')}${w ? '' : ' reps'}`;
  }
  return `La última vez: ${p.sets.map((s) => `${fmt(s.weightKg)}×${s.reps}`).join(', ')}`;
}

export const clock = (ms: number) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

/** Ejercicio con todas sus series hechas: en vivo se pliega arriba. */
export const isExerciseDone = (e: LiveExercise) => e.sets.length > 0 && e.sets.every((s) => s.done);

/** Siguiente ejercicio pendiente después de `from` (vuelve al principio si no hay más abajo). */
export function nextPending(w: LiveWorkout, from: number): number | null {
  const pending = w.exercises.map((_, j) => j).filter((j) => j !== from && !isExerciseDone(w.exercises[j]));
  return pending.find((j) => j > from) ?? pending[0] ?? null;
}

type PrevSet = PreviousSets['sets'][number];

/** La serie de la última vez que va con la serie `k` de hoy (por orden, sin calentamientos). */
export function previousSetAt(e: LiveExercise, k: number): PrevSet | null {
  // La última vez solo trae series de trabajo: se emparejan con las de trabajo de hoy.
  const n = workNumber(e, k);
  return n === null ? null : (e.previous?.sets[n - 1] ?? null);
}

/** Texto corto de una serie anterior para la columna «Anterior»: «80×8», «1000 m», «1:30»… */
export function previousSetLabel(p: PrevSet, measure: Measure, bodyweight: boolean): string {
  const kg = p.weightKg ? `${fmt(p.weightKg)}` : '';
  switch (measure) {
    case 'DISTANCE':
      return formatDistance(p.distanceM) || formatTime(p.durationSec) || '—';
    case 'TIME':
      return formatTime(p.durationSec) || '—';
    case 'CALORIES':
      return p.calories ? `${p.calories} cal` : '—';
    default:
      // Con peso corporal, el «kg» es lastre: si no hubo, solo cuentan las reps.
      return kg ? `${bodyweight ? '+' : ''}${kg}×${p.reps}` : `${p.reps} reps`;
  }
}

/** Lo de la última vez convertido en valores de la serie, para copiarlo con un toque. */
export function previousAsSet(p: PrevSet, measure: Measure): Partial<Omit<LiveSet, 'done'>> {
  const weight = p.weightKg ? fmt(p.weightKg) : '';
  switch (measure) {
    case 'DISTANCE':
      return { weight, distance: p.distanceM ? String(p.distanceM) : '', time: formatTime(p.durationSec) };
    case 'TIME':
      return { weight, time: formatTime(p.durationSec) };
    case 'CALORIES':
      return { cal: p.calories ? String(p.calories) : '', time: formatTime(p.durationSec) };
    default:
      return { weight, reps: String(p.reps) };
  }
}

/** Resumen de un ejercicio hecho, para su fila plegada: «3 series · mejor 82,5 kg × 8». */
export function doneSummary(e: LiveExercise): string {
  const all = e.sets.filter((s) => s.done);
  // El resumen es de las series de trabajo; si todo fue calentamiento, de todas.
  const work = all.filter((s) => !s.warmup);
  const done = work.length ? work : all;
  const count = `${done.length} ${done.length === 1 ? 'serie' : 'series'}`;
  if (e.measure !== 'REPS') {
    const first = done[0];
    if (!first) return count;
    const what =
      e.measure === 'DISTANCE'
        ? formatDistance(num(first.distance))
        : e.measure === 'CALORIES'
          ? first.cal && `${first.cal} cal`
          : '';
    const time = first.time && (what ? `en ${first.time}` : first.time);
    const detail = [what, time].filter(Boolean).join(' ');
    return detail ? `${count} · ${detail}` : count;
  }
  const best = done.reduce<LiveSet | null>((b, s) => {
    if (!b) return s;
    const [bw, sw] = [num(b.weight) ?? 0, num(s.weight) ?? 0];
    return sw > bw || (sw === bw && (num(s.reps) ?? 0) > (num(b.reps) ?? 0)) ? s : b;
  }, null);
  if (!best) return count;
  const w = num(best.weight);
  return `${count} · mejor ${w ? `${fmt(w)} kg × ` : ''}${best.reps}${w ? '' : ' reps'}`;
}
