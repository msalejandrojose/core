import type { ActivityType } from '../../domain/entities/activity-type.entity';
import type {
  ActivitySession,
  Effort,
} from '../../domain/entities/activity-session.entity';

export const NUTRE_ACTIVITY_REPOSITORY = Symbol('NUTRE_ACTIVITY_REPOSITORY');

export interface CreateSessionData {
  userId: string;
  activityTypeId: string;
  startedAt: Date;
  loggedOn: string;
  durationSec: number;
  distanceM: number | null;
  avgHeartRate: number | null;
  effort: Effort | null;
  kcalBurned: number;
  notes: string | null;
}

export interface NutreActivityRepositoryPort {
  /** Catálogo visible para el usuario: las globales más las suyas. */
  listTypesVisibleTo(userId: string): Promise<ActivityType[]>;
  /** Un tipo, solo si es global o del propio usuario. */
  findTypeVisibleTo(id: string, userId: string): Promise<ActivityType | null>;
  createSession(data: CreateSessionData): Promise<ActivitySession>;
  /** Una sesión, solo si es del usuario. */
  findSession(id: string, userId: string): Promise<ActivitySession | null>;
  /** Borra la sesión solo si es del usuario. `false` si no existía o no era suya. */
  deleteSession(id: string, userId: string): Promise<boolean>;
  listSessionsByDay(userId: string, day: string): Promise<ActivitySession[]>;
  /** Suma de kcal gastadas en un día, para el agregado diario. */
  sumKcalByDay(userId: string, day: string): Promise<number>;
}
