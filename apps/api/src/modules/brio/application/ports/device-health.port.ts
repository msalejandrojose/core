import type { DailyHealth } from '../../domain/services/garmin';
import type { DevicePlatform } from '../../domain/services/device-health';

export const BRIO_DEVICE_HEALTH_REPOSITORY = Symbol(
  'BRIO_DEVICE_HEALTH_REPOSITORY',
);

export interface HealthDeviceState {
  platform: DevicePlatform;
  lastSyncAt: Date | null;
  lastSyncDays: number | null;
  lastSyncWorkouts: number | null;
}

export interface DeviceSessionData {
  activityTypeId: string;
  startedAt: Date;
  loggedOn: string;
  durationSec: number;
  distanceM: number | null;
  kcalBurned: number;
  notes: string | null;
}

/** Sesión ya guardada que puede ser el mismo entreno visto por otra fuente. */
export interface ExistingSession {
  externalId: string | null;
  fromDevice: boolean;
  startedAt: Date;
  durationSec: number;
}

export interface BrioDeviceHealthRepositoryPort {
  getDevice(userId: string): Promise<HealthDeviceState | null>;
  saveSync(
    userId: string,
    platform: DevicePlatform,
    data: { lastSyncAt: Date; lastSyncDays: number; lastSyncWorkouts: number },
  ): Promise<void>;
  deleteDevice(userId: string): Promise<void>;
  hasGarmin(userId: string): Promise<boolean>;

  /** Salud ya guardada de esos días, con si la trajo Garmin. */
  healthDays(
    userId: string,
    days: string[],
  ): Promise<Map<string, DailyHealth & { fromGarmin: boolean }>>;
  saveHealthDay(
    userId: string,
    platform: DevicePlatform,
    day: string,
    values: Partial<DailyHealth>,
  ): Promise<void>;

  /** Sesiones con hora de inicio entre esas fechas (para no duplicar entrenos). */
  sessionsBetween(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<ExistingSession[]>;
  upsertSession(
    userId: string,
    platform: DevicePlatform,
    externalId: string,
    data: DeviceSessionData,
  ): Promise<{ created: boolean; previousDay: string | null }>;
  /** Días con peso ya apuntado (a mano o por otra fuente): no se pisan. */
  weighedDays(userId: string, from: string, to: string): Promise<Set<string>>;
}
