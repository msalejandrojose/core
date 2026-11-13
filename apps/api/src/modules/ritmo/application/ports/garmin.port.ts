import type {
  DailyHealth,
  GarminActivity,
  GarminDailySummary,
  GarminHrv,
  GarminSleep,
} from '../../domain/services/garmin';

export const GARMIN_CLIENT = Symbol('RITMO_GARMIN_CLIENT');
export const RITMO_GARMIN_REPOSITORY = Symbol('RITMO_GARMIN_REPOSITORY');

/** Fallo al hablar con Garmin; `status` 0 = no hubo respuesta. */
export class GarminApiError extends Error {
  constructor(readonly status: number) {
    super(`Garmin respondió ${status}`);
  }
}

/**
 * Garmin Connect Personal API (https://developer.garmin.com/gc-developer-program/personal/).
 * La clave personal solo sirve para pedir un token de acceso, válido 24 h.
 */
export interface GarminClientPort {
  accessToken(apiKey: string): Promise<string>;
  activities(
    token: string,
    query: { startDate: string; start: number; limit: number },
  ): Promise<GarminActivity[]>;
  dailySummaries(
    token: string,
    from: string,
    to: string,
  ): Promise<GarminDailySummary[]>;
  /** Como mucho 31 días por consulta. */
  sleep(token: string, from: string, to: string): Promise<GarminSleep[]>;
  hrv(token: string, from: string, to: string): Promise<GarminHrv[]>;
}

export interface GarminConnection {
  apiKeyEnc: string;
  lastSyncAt: Date | null;
  lastSyncCount: number | null;
  lastError: string | null;
}

export interface GarminSessionData {
  activityTypeId: string;
  startedAt: Date;
  loggedOn: string;
  durationSec: number;
  distanceM: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  elevationGainM: number | null;
  cadence: number | null;
  zoneSeconds: number[] | null;
  kcalBurned: number;
  notes: string | null;
}

export interface RitmoGarminRepositoryPort {
  getConnection(userId: string): Promise<GarminConnection | null>;
  saveConnection(userId: string, apiKeyEnc: string): Promise<void>;
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

  /** Tipo de actividad del catálogo por código. */
  typeByCode(code: string): Promise<{ id: string; met: number } | null>;
  /** Tipo propio "Otra actividad" para lo que no tiene equivalente; lo crea si falta. */
  ensureOtherType(userId: string): Promise<{ id: string; met: number }>;
  /** Días (YYYY-MM-DD) con entrenos traídos de Hevy: ahí Garmin no añade fuerza. */
  hevyDays(userId: string, from: string): Promise<Set<string>>;

  upsertImported(
    userId: string,
    externalId: string,
    data: GarminSessionData,
  ): Promise<{ created: boolean; previousDay: string | null }>;

  upsertDailyHealth(userId: string, days: DailyHealth[]): Promise<void>;
  dailyHealth(userId: string, from: string, to: string): Promise<DailyHealth[]>;
}
