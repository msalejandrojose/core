import type { ActivityType } from '../../domain/entities/activity-type.entity';
import type {
  ActivitySession,
  Effort,
} from '../../domain/entities/activity-session.entity';
import type { StrengthSet } from '../../domain/entities/performance.entity';

/** Entrenos de un día: cuántos y cuántos minutos. */
export interface DaySessionStats {
  day: string;
  sessions: number;
  minutes: number;
}

export const RITMO_ACTIVITY_REPOSITORY = Symbol('RITMO_ACTIVITY_REPOSITORY');

export interface CreateSessionData {
  userId: string;
  activityTypeId: string;
  startedAt: Date;
  loggedOn: string;
  durationSec: number;
  distanceM: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  elevationGainM: number | null;
  cadence: number | null;
  rpe: number | null;
  zoneSeconds: number[] | null;
  effort: Effort | null;
  kcalBurned: number;
  notes: string | null;
  sets: StrengthSet[];
}

export interface RitmoActivityRepositoryPort {
  /** Catálogo visible para el usuario: las globales más las suyas. */
  listTypesVisibleTo(userId: string): Promise<ActivityType[]>;
  /** Un tipo, solo si es global o del propio usuario. */
  findTypeVisibleTo(id: string, userId: string): Promise<ActivityType | null>;
  createSession(data: CreateSessionData): Promise<ActivitySession>;
  /** Una sesión, solo si es del usuario. */
  findSession(id: string, userId: string): Promise<ActivitySession | null>;
  /** Borra la sesión solo si es del usuario. `false` si no existía o no era suya. */
  deleteSession(id: string, userId: string): Promise<boolean>;
  /** Sustituye todas las series de una sesión del usuario (edición del entreno). */
  replaceSets(
    sessionId: string,
    userId: string,
    sets: StrengthSet[],
  ): Promise<void>;
  listSessionsByDay(userId: string, day: string): Promise<ActivitySession[]>;
  /** Suma de kcal gastadas en un día, para el agregado diario. */
  sumKcalByDay(userId: string, day: string): Promise<number>;
  /** Entrenos por día entre dos días (incluidos). Solo días con algún entreno. */
  sessionStatsBetween(
    userId: string,
    from: string,
    to: string,
  ): Promise<DaySessionStats[]>;
}
