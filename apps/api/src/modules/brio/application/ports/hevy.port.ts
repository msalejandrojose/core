import type {
  MuscleWeight,
  StrengthSet,
} from '../../domain/entities/performance.entity';
import type {
  HevyTemplate,
  HevyWorkout,
  RoutineExercise,
  RoutineSourceSet,
} from '../../domain/services/hevy';

export const HEVY_CLIENT = Symbol('BRIO_HEVY_CLIENT');
export const BRIO_HEVY_REPOSITORY = Symbol('BRIO_HEVY_REPOSITORY');
export const BRIO_SECRET_CIPHER = Symbol('BRIO_SECRET_CIPHER');

/** Fallo al hablar con Hevy; `status` 0 = no hubo respuesta. */
export class HevyApiError extends Error {
  constructor(readonly status: number) {
    super(`Hevy respondió ${status}`);
  }
}

export type HevyEvent =
  | { type: 'updated'; workout: HevyWorkout }
  | { type: 'deleted'; id: string };

export interface Page<T> {
  pageCount: number;
  items: T[];
}

/** La API pública de Hevy (https://api.hevyapp.com/docs), con la clave del usuario. */
export interface HevyClientPort {
  userInfo(apiKey: string): Promise<{ username: string }>;
  workouts(apiKey: string, page: number): Promise<Page<HevyWorkout>>;
  workoutEvents(
    apiKey: string,
    since: Date,
    page: number,
  ): Promise<Page<HevyEvent>>;
  exerciseTemplates(apiKey: string, page: number): Promise<Page<HevyTemplate>>;
  createRoutine(
    apiKey: string,
    routine: { title: string; notes: string; exercises: RoutineExercise[] },
  ): Promise<{ id: string | null }>;
  /** Sustituye la rutina; lanza HevyApiError(404) si ya no existe en Hevy. */
  updateRoutine(
    apiKey: string,
    routineId: string,
    routine: { title: string; notes: string; exercises: RoutineExercise[] },
  ): Promise<void>;
}

export interface SecretCipher {
  encrypt(plain: string): string;
  decrypt(cipher: string): string;
}

export interface HevyConnection {
  apiKeyEnc: string;
  username: string | null;
  lastSyncAt: Date | null;
  lastSyncCount: number | null;
  lastError: string | null;
}

export interface ImportedSessionData {
  activityTypeId: string;
  startedAt: Date;
  loggedOn: string;
  durationSec: number;
  kcalBurned: number;
  notes: string | null;
  sets: StrengthSet[];
}

export interface ImportedWorkoutItem {
  externalId: string;
  data: ImportedSessionData;
  /** Rutina con la que enlazarlo si aún no tiene ninguna. */
  routineId: string | null;
}

export interface ImportedWorkoutOutcome {
  /** Nuevo en Brío. */
  created: boolean;
  /** Ya estaba y algo ha cambiado (datos, series o rutina). */
  changed: boolean;
  /** Día en el que estaba antes, si ya existía. */
  previousDay: string | null;
}

export interface StrengthSessionWithSets {
  id: string;
  day: string;
  sets: (RoutineSourceSet & {
    exerciseCode: string | null;
    primaryMuscle: string | null;
  })[];
}

export interface PlannedForHevy {
  kind: string;
  title: string;
  templateCode: string | null;
  structure: Record<string, unknown> | null;
}

export interface BrioHevyRepositoryPort {
  getConnection(userId: string): Promise<HevyConnection | null>;
  saveConnection(
    userId: string,
    data: { apiKeyEnc: string; username: string | null },
  ): Promise<void>;
  deleteConnection(userId: string): Promise<void>;
  markSync(
    userId: string,
    data: {
      lastSyncAt?: Date;
      lastSyncCount?: number;
      lastError: string | null;
    },
  ): Promise<void>;
  countImported(userId: string): Promise<number>;

  links(userId: string): Promise<{ templateId: string; exerciseId: string }[]>;
  saveLink(
    userId: string,
    templateId: string,
    exerciseId: string,
  ): Promise<void>;
  /** Ejercicios del catálogo global, por código. */
  catalog(): Promise<{ id: string; code: string }[]>;
  /** Ejercicio propio del usuario con ese nombre; lo crea si no existe. */
  ensureOwnExercise(
    userId: string,
    data: { name: string; isBodyweight: boolean; muscles: MuscleWeight[] },
  ): Promise<string>;
  strengthType(userId: string): Promise<{ id: string; met: number } | null>;

  /**
   * Crea o actualiza de una vez muchos entrenos importados (en bloque, sin una
   * ida y vuelta a la base de datos por entreno). Los que ya estaban y no han
   * cambiado no se tocan. Devuelve, en el mismo orden, qué pasó con cada uno.
   */
  upsertImportedMany(
    userId: string,
    items: ImportedWorkoutItem[],
  ): Promise<ImportedWorkoutOutcome[]>;
  /** Borra el entreno importado; devuelve su día, o null si no estaba. */
  deleteImported(userId: string, externalId: string): Promise<string | null>;

  recentStrengthSessions(
    userId: string,
    limit: number,
  ): Promise<StrengthSessionWithSets[]>;
  getPlanned(userId: string, day: string): Promise<PlannedForHevy | null>;
  savePlannedStructure(
    userId: string,
    day: string,
    structure: Record<string, unknown>,
  ): Promise<void>;
}
