import type {
  ActualSession,
  Plan,
  PlannedSession,
} from '../../domain/entities/plan.entity';

export const RITMO_PLAN_REPOSITORY = Symbol('RITMO_PLAN_REPOSITORY');

export interface SavePlanData {
  name: string;
  raceDate: string | null;
  raceDistanceM: number | null;
  targetTimeSec: number | null;
  notes: string | null;
}

/** Lo que define una sesión planificada (sin el check de completado). */
export type PlannedSessionData = Pick<
  PlannedSession,
  | 'kind'
  | 'templateCode'
  | 'title'
  | 'load'
  | 'startTime'
  | 'plannedDurationMin'
  | 'plannedDistanceM'
  | 'targetPaceSecPerKm'
  | 'structure'
  | 'notes'
>;

export interface CompletionData {
  completedAt: Date | null;
  completedSessionId: string | null;
  actualNotes: string | null;
  skipped: boolean;
}

export interface RitmoPlanRepositoryPort {
  findActivePlan(userId: string): Promise<Plan | null>;
  /** Crea el plan activo o actualiza el que haya. */
  saveActivePlan(userId: string, data: SavePlanData): Promise<Plan>;
  /** Archiva el plan activo (no borra sus sesiones). `false` si no había. */
  archiveActivePlan(userId: string): Promise<boolean>;

  plannedBetween(
    userId: string,
    from: string,
    to: string,
  ): Promise<PlannedSession[]>;
  findPlanned(userId: string, day: string): Promise<PlannedSession | null>;
  /**
   * Pone la sesión de un día. Si ya había una, la sustituye y le quita el
   * check: es otra sesión.
   */
  upsertPlanned(
    userId: string,
    day: string,
    planId: string | null,
    data: PlannedSessionData,
  ): Promise<PlannedSession>;
  deletePlanned(userId: string, day: string): Promise<boolean>;
  setCompletion(
    userId: string,
    day: string,
    data: CompletionData,
  ): Promise<PlannedSession | null>;

  /** Entrenos reales entre dos días, para cruzarlos con el plan. */
  actualsBetween(
    userId: string,
    from: string,
    to: string,
  ): Promise<ActualSession[]>;
}
