import { MUSCLE_NAME } from '../performance/labels';
import type { DraftExercise } from '../sheets/workout-draft';
import type { MuscleShare, Routine, RoutineKind, SaveRoutineBody } from './routines.api';

/** Pantallas de rutinas: tipos, formatos y conversiones puras (probadas). */

export const ROUTINE_KINDS: { value: RoutineKind; label: string; activityCode: string | null }[] = [
  { value: 'STRENGTH', label: 'Gimnasio', activityCode: 'strength' },
  { value: 'RUN', label: 'Carrera', activityCode: 'running' },
  { value: 'CYCLE', label: 'Bici', activityCode: 'cycling' },
  { value: 'SWIM', label: 'Natación', activityCode: 'swimming' },
  { value: 'WALK', label: 'Caminar', activityCode: 'walking' },
  { value: 'OTHER_CARDIO', label: 'Otro cardio', activityCode: null },
];

export const kindLabel = (k: RoutineKind) => ROUTINE_KINDS.find((x) => x.value === k)?.label ?? 'Otro';

/** Ejercicio en el editor de rutinas: números ya validados por los steppers. */
export interface RoutineDraftExercise {
  exerciseId: string;
  name: string;
  bodyweight: boolean;
  muscles: { muscle: string; weight: number }[];
  sets: number;
  reps: number;
  /** Texto libre para poder teclear decimales con coma. */
  weight: string;
  rest: string;
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
      bodyweight: bodyweightOf(e.exerciseId),
      muscles: e.muscles,
      sets: e.sets,
      reps: e.reps,
      weight: e.weightKg ? String(e.weightKg).replace('.', ',') : '',
      rest: e.restSec ? String(e.restSec) : '',
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
            const w = num(e.weight);
            const rest = num(e.rest);
            return {
              exerciseId: e.exerciseId,
              sets: e.sets,
              reps: e.reps,
              weightKg: w && w > 0 ? w : null,
              restSec: rest !== null && rest >= 0 ? Math.round(rest) : null,
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
  return r.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    name: e.name,
    bodyweight: bodyweightOf(e.exerciseId),
    rest: e.restSec ? String(e.restSec) : '',
    sets: Array.from({ length: e.sets }, () => ({
      weight: e.weightKg ? String(e.weightKg).replace('.', ',') : '',
      reps: String(e.reps),
      rir: '',
      warmup: false,
    })),
  }));
}
