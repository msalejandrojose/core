import type { CleanRoutine, RoutineKind } from '../../domain/services/routine';

export const BRIO_ROUTINE_REPOSITORY = Symbol('BRIO_ROUTINE_REPOSITORY');

export interface RoutineExerciseView {
  exerciseId: string;
  code: string | null;
  name: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  restSec: number | null;
  muscles: { muscle: string; weight: number }[];
}

export interface RoutineView {
  id: string;
  name: string;
  kind: RoutineKind;
  notes: string | null;
  plannedDurationMin: number | null;
  plannedDistanceM: number | null;
  targetPaceSecPerKm: number | null;
  hevyRoutineId: string | null;
  hevySentAt: Date | null;
  exercises: RoutineExerciseView[];
  /** Última vez que se hizo (sesión enlazada más reciente). */
  lastDoneAt: Date | null;
  timesDone: number;
}

export interface LinkableSession {
  id: string;
  startedAt: Date;
  kind: string;
}

export interface BrioRoutineRepositoryPort {
  list(userId: string): Promise<RoutineView[]>;
  get(userId: string, id: string): Promise<RoutineView | null>;
  create(userId: string, data: CleanRoutine): Promise<string>;
  update(userId: string, id: string, data: CleanRoutine): Promise<boolean>;
  archive(userId: string, id: string): Promise<boolean>;
  /** Ejercicios que el usuario no puede usar (ni globales ni suyos). */
  missingExercises(userId: string, ids: string[]): Promise<string[]>;
  setHevyRoutine(id: string, hevyRoutineId: string | null): Promise<void>;

  /** Enlaza una sesión del usuario con una de sus rutinas. */
  linkSession(
    userId: string,
    sessionId: string,
    routineId: string,
  ): Promise<boolean>;
  /** Enlaza el entreno importado (fuente + id externo) con la rutina, si no tenía ya una. */
  linkImported(
    userId: string,
    source: 'HEVY' | 'GARMIN',
    externalId: string,
    routineId: string,
  ): Promise<void>;
  /** Entrenos de Garmin desde `since` sin rutina, el más reciente primero. */
  unlinkedGarminSessions(
    userId: string,
    since: Date,
  ): Promise<LinkableSession[]>;
}
