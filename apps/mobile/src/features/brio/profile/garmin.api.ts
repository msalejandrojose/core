import { useCallback, useEffect, useState } from 'react';
import { call, isApiError } from '../api';

/** Contrato de `/brio/garmin` y `/brio/health`. La clave solo viaja al conectar y nunca vuelve. */

export interface GarminStatus {
  connected: boolean;
  lastSyncAt: string | null;
  lastSyncCount: number | null;
  importedSessions: number;
  lastError: string | null;
}

export interface GarminSyncResult {
  imported: number;
  updated: number;
  skipped: number;
  healthDays: number;
}

export interface DailyHealth {
  day: string;
  restingHr: number | null;
  steps: number | null;
  sleepSec: number | null;
  deepSleepSec: number | null;
  remSleepSec: number | null;
  awakeSec: number | null;
  sleepScore: number | null;
  hrvMs: number | null;
  stressAvg: number | null;
  bodyBatteryMax: number | null;
}

export interface HealthBaseline {
  latest: number | null;
  baseline: number | null;
  deltaPct: number | null;
  day: string | null;
}

export interface RecentHealth {
  days: DailyHealth[];
  sleep: HealthBaseline;
  hrv: HealthBaseline;
  restingHr: HealthBaseline;
}

export const garminApi = {
  status: () => call<GarminStatus>('GET', '/brio/garmin'),
  connect: (apiKey: string) =>
    call<{ status: GarminStatus; sync: GarminSyncResult | null }>('PUT', '/brio/garmin', { body: { apiKey, importNow: true } }),
  sync: () => call<{ status: GarminStatus; sync: GarminSyncResult }>('POST', '/brio/garmin/sync'),
  disconnect: () => call<void>('DELETE', '/brio/garmin'),
  recentHealth: () => call<RecentHealth>('GET', '/brio/health/recent'),
};

const ERROR_TEXT: Record<string, string> = {
  BRIO_GARMIN_KEY_INVALID: 'Garmin no acepta esa clave. Revisa que la has copiado entera y que no ha caducado.',
  BRIO_GARMIN_RATE_LIMIT: 'Garmin está limitando las peticiones. Prueba otra vez en unos minutos.',
  BRIO_GARMIN_UNAVAILABLE: 'No hemos podido hablar con Garmin. Prueba otra vez en un rato.',
  BRIO_GARMIN_NOT_CONNECTED: 'Conecta Garmin primero.',
};

export function garminErrorText(e: unknown): string | undefined {
  if (!isApiError(e)) return undefined;
  return ERROR_TEXT[e.code] ?? ERROR_TEXT[e.message] ?? e.message;
}

/** "3 entrenos nuevos · 12 días de salud", o que no había nada. */
export function garminSyncSummary(r: GarminSyncResult): string {
  const parts: string[] = [];
  if (r.imported) parts.push(`${r.imported} ${r.imported === 1 ? 'entreno nuevo' : 'entrenos nuevos'}`);
  if (r.updated) parts.push(`${r.updated} ${r.updated === 1 ? 'actualizado' : 'actualizados'}`);
  if (r.healthDays) parts.push(`${r.healthDays} ${r.healthDays === 1 ? 'día' : 'días'} de salud`);
  return parts.length ? parts.join(' · ') : 'No había nada nuevo';
}

export function useGarminStatus() {
  const [status, setStatus] = useState<GarminStatus | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    garminApi
      .status()
      .then((s) => alive && setStatus(s))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { status, setStatus, reload };
}

export function useRecentHealth() {
  const [health, setHealth] = useState<RecentHealth | null>(null);
  useEffect(() => {
    let alive = true;
    garminApi
      .recentHealth()
      .then((h) => alive && setHealth(h))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return health;
}

const AUTO_SYNC_EVERY_MS = 3 * 60 * 60 * 1000;
let autoSynced = false;

/** Trae lo nuevo de Garmin al abrir la app, una vez por sesión y solo si la última vez es antigua. */
export function useGarminAutoSync() {
  useEffect(() => {
    if (autoSynced) return;
    autoSynced = true;
    void garminApi
      .status()
      .then((s) => {
        const stale = !s.lastSyncAt || Date.now() - Date.parse(s.lastSyncAt) > AUTO_SYNC_EVERY_MS;
        if (s.connected && stale) return garminApi.sync();
        return undefined;
      })
      .catch(() => undefined);
  }, []);
}
