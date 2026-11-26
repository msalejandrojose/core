import { MUSCLE_NAME } from '../performance/labels';
import type { DraftExercise } from '../sheets/workout-draft';
import type { Measure } from '../performance/perf.api';
import { formatTime, parseTime } from './measures';
import type { MuscleShare, Routine, RoutineExercise, RoutineKind, RoutineSetPlan, SaveRoutineBody } from './routines.api';

/** Pantallas de rutinas: tipos, formatos y conversiones puras (probadas). */

export const ROUTINE_KINDS: { value: RoutineKind; label: string; activityCode: string | null }[] = [
  { value: 'STRENGTH', label: 'Gimnasio / híbrido', activityCode: 'strength' },
  { value: 'RUN', label: 'Carrera', activityCode: 'running' },
  { value: 'CYCLE', label: 'Bici', activityCode: 'cycling' },
  { value: 'SWIM', label: 'Natación', activityCode: 'swimming' },
  { value: 'WALK', label: 'Caminar', activityCode: 'walking' },
  { value: 'OTHER_CARDIO', label: 'Otro cardio', activityCode: null },
];

export const kindLabel = (k: RoutineKind) => ROUTINE_KINDS.find((x) => x.value === k)?.label ?? 'Otro';

/** Una serie en el editor: texto libre para poder teclear decimales con coma. */
export interface DraftSetRow {
  reps: string;
  weight: string;
}

/** Ejercicio en el editor de rutinas. */
export interface RoutineDraftExercise {
  exerciseId: string;
  name: string;
  bodyweight: boolean;
  muscles: { muscle: string; weight: number }[];
  /** Una fila por serie, cada una con sus repeticiones y su peso. */
  rows: DraftSetRow[];
  /** Descanso en segundos ('' = sin descanso). */
  rest: string;
  /** Superserie (mismo número que el de al lado). */
  group: number | null;
  /** Cómo se mide y el objetivo por serie si no son repeticiones. */
  measure: Measure;
  distance: string;
  time: string;
  calories: string;
}

export interface RoutineDraft {
  name: string;
  kind: RoutineKind;
  notes: string;
  minutes: string;
  distanceKm: string;
  /** Ritmo «m:ss» por km. */
  pace: string;
  exercises: RoutineDraftExercise[];
}

export const EMPTY_ROUTINE: RoutineDraft = {
  name: '',
  kind: 'STRENGTH',
  notes: '',
  // Lo que marca de partida el selector de duración de gimnasio.
  minutes: '60',
  distanceKm: '',
  pace: '',
  exercises: [],
};

const num = (v: string) => {
  const n = Number(v.replace(',', '.'));
  return v.trim() !== '' && Number.isFinite(n) ? n : null;
};

export function paceToSec(pace: string): number | null {
  const m = /^(\d{1,2}):([0-5]\d)$/.exec(pace.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export const secToPace = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

const kgText = (w: number | null | undefined) => (w ? String(w).replace('.', ',') : '');

/** Las series de un ejercicio de rutina una a una, tengan plan propio o no. */
export function setsOf(e: Pick<RoutineExercise, 'sets' | 'reps' | 'weightKg' | 'setPlan'>): RoutineSetPlan[] {
  if (e.setPlan?.length) return e.setPlan;
  return Array.from({ length: e.sets }, () => ({ reps: e.reps, weightKg: e.weightKg }));
}

/** Series iniciales de un ejercicio recién añadido. */
export const newRows = (count: number, reps = 10): DraftSetRow[] =>
  Array.from({ length: count }, () => ({ reps: String(reps), weight: '' }));

/** Una serie más, copia de la última (así una pirámide se sigue rápido). */
export const addRow = (rows: DraftSetRow[]): DraftSetRow[] =>
  rows.length >= 20 ? rows : [...rows, { ...(rows[rows.length - 1] ?? { reps: '10', weight: '' }) }];

/** Cambia el número de series (para lo que no va por repeticiones). */
export const resizeRows = (rows: DraftSetRow[], n: number): DraftSetRow[] =>
  n > rows.length ? Array.from({ length: n - rows.length }).reduce<DraftSetRow[]>((r) => addRow(r), rows) : rows.slice(0, Math.max(1, n));

/** Series del borrador como plan para la API (repeticiones de 1 a 100, peso o nada). */
export function rowsPlan(rows: DraftSetRow[]): RoutineSetPlan[] {
  const list = rows.length ? rows : newRows(1);
  return list.map((r) => {
    const reps = num(r.reps);
    const w = num(r.weight);
    return {
      reps: reps === null ? 10 : Math.min(100, Math.max(1, Math.round(reps))),
      weightKg: w && w > 0 ? w : null,
    };
  });
}

export function draftFrom(r: Routine, bodyweightOf: (id: string) => boolean = () => false): RoutineDraft {
  return {
    name: r.name,
    kind: r.kind,
    notes: r.notes ?? '',
    minutes: r.plannedDurationMin ? String(r.plannedDurationMin) : '',
    distanceKm: r.plannedDistanceM ? String(Math.round(r.plannedDistanceM / 100) / 10).replace('.', ',') : '',
    pace: r.targetPaceSecPerKm ? secToPace(r.targetPaceSecPerKm) : '',
    exercises: r.exercises.map((e) => ({
      exerciseId: e.exerciseId,
      name: e.name,
      bodyweight: e.isBodyweight ?? bodyweightOf(e.exerciseId),
      muscles: e.muscles,
      rows: setsOf(e).map((x) => ({ reps: String(x.reps), weight: kgText(x.weightKg) })),
      rest: e.restSec ? String(e.restSec) : '',
      group: e.supersetGroup,
      measure: e.measure ?? 'REPS',
      distance: e.distanceM ? String(e.distanceM) : '',
      time: formatTime(e.durationSec),
      calories: e.calories ? String(e.calories) : '',
    })),
  };
}

export function routineBody(d: RoutineDraft): SaveRoutineBody {
  const strength = d.kind === 'STRENGTH';
  const minutes = num(d.minutes);
  const km = num(d.distanceKm);
  return {
    name: d.name.trim(),
    kind: d.kind,
    notes: d.notes.trim() || null,
    plannedDurationMin: minutes ? Math.round(minutes) : null,
    ...(strength
      ? {
          exercises: d.exercises.map((e) => {
            const plan = rowsPlan(e.rows);
            const weights = plan.map((x) => x.weightKg).filter((w): w is number => w !== null);
            const same = plan.every((x) => x.reps === plan[0].reps && x.weightKg === plan[0].weightKg);
            const rest = num(e.rest);
            return {
              exerciseId: e.exerciseId,
              sets: plan.length,
              reps: plan[0].reps,
              weightKg: weights.length ? Math.max(...weights) : null,
              // Solo si cambia de una serie a otra; si no, basta con el resumen.
              ...(same ? {} : { setPlan: plan }),
              restSec: rest !== null && rest >= 0 ? Math.round(rest) : null,
              supersetGroup: e.group,
              ...(e.measure === 'DISTANCE' ? { distanceM: num(e.distance) ? Math.round(num(e.distance)!) : null } : {}),
              ...(e.measure === 'TIME' ? { durationSec: parseTime(e.time) } : {}),
              ...(e.measure === 'CALORIES' ? { calories: num(e.calories) ? Math.round(num(e.calories)!) : null } : {}),
            };
          }),
        }
      : {
          plannedDistanceM: km && km > 0 ? Math.round(km * 1000) : null,
          targetPaceSecPerKm: paceToSec(d.pace),
        }),
  };
}

/** Lo mismo que hace la API: series × peso de cada músculo, en partes del total. */
export function musclesOf(exercises: { sets: number; muscles: { muscle: string; weight: number }[] }[]): MuscleShare[] {
  const load = new Map<string, number>();
  const primary = new Set<string>();
  for (const e of exercises)
    for (const m of e.muscles) {
      load.set(m.muscle, (load.get(m.muscle) ?? 0) + e.sets * m.weight);
      if (m.weight >= 1) primary.add(m.muscle);
    }
  const total = [...load.values()].reduce((a, b) => a + b, 0);
  if (!total) return [];
  return [...load]
    .map(([muscle, l]) => ({ muscle, share: Math.round((l / total) * 100) / 100, primary: primary.has(muscle) }))
    .sort((a, b) => b.share - a.share);
}

/** «Pectoral, Tríceps y Deltoides anterior»: los principales primero, como mucho tres. */
export function musclesLine(muscles: MuscleShare[], max = 3): string {
  const names = muscles
    .filter((m) => m.share >= 0.08)
    .slice(0, max)
    .map((m) => MUSCLE_NAME[m.muscle] ?? m.muscle);
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/** «4 ejercicios · 14 series · 50 min» o «45 min · 8 km · 4:30/km». */
export function routineSummary(r: Pick<Routine, 'kind' | 'exercises' | 'plannedDurationMin' | 'plannedDistanceM' | 'targetPaceSecPerKm'>): string {
  const parts: string[] = [];
  if (r.kind === 'STRENGTH') {
    const sets = r.exercises.reduce((a, e) => a + e.sets, 0);
    parts.push(`${r.exercises.length} ${r.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}`, `${sets} series`);
  }
  if (r.plannedDurationMin) parts.push(`${r.plannedDurationMin} min`);
  if (r.plannedDistanceM) parts.push(`${String(Math.round(r.plannedDistanceM / 100) / 10).replace('.', ',')} km`);
  if (r.targetPaceSecPerKm) parts.push(`${secToPace(r.targetPaceSecPerKm)}/km`);
  return parts.join(' · ');
}

/** Ejercicios de la rutina como borrador del registro: una fila por serie prevista. */
export function workoutDraftFrom(r: Routine, bodyweightOf: (id: string) => boolean = () => false): DraftExercise[] {
  // El registro rápido va por series × repeticiones; carrera, remo o trineo se
  // apuntan entrenando en Brío (metros y tiempo).
  return r.exercises.filter((e) => (e.measure ?? 'REPS') === 'REPS').map((e) => ({
    exerciseId: e.exerciseId,
    name: e.name,
    bodyweight: bodyweightOf(e.exerciseId),
    rest: e.restSec ? String(e.restSec) : '',
    sets: setsOf(e).map((x) => ({
      weight: kgText(x.weightKg),
      reps: String(x.reps),
      rir: '',
      warmup: false,
    })),
  }));
}
