import { useCallback, useEffect, useState } from 'react';
import { call, isApiError } from '../api';

/** Contrato de `/ritmo/hevy`. La clave solo viaja al conectar y nunca vuelve. */

export interface HevyStatus {
  connected: boolean;
  username: string | null;
  lastSyncAt: string | null;
  lastSyncCount: number | null;
  importedSessions: number;
  lastError: string | null;
}

export interface HevySyncResult {
  imported: number;
  updated: number;
  deleted: number;
  truncated: boolean;
}

export interface SentRoutine {
  routineId: string | null;
  title: string;
  exercises: number;
  skipped: string[];
  basedOnSessionId: string;
  basedOnDay: string;
}

export const hevyApi = {
  status: () => call<HevyStatus>('GET', '/ritmo/hevy'),
  connect: (apiKey: string, importNow: boolean) =>
    call<{ status: HevyStatus; sync: HevySyncResult | null }>('PUT', '/ritmo/hevy', { body: { apiKey, importNow } }),
  sync: () => call<{ status: HevyStatus; sync: HevySyncResult }>('POST', '/ritmo/hevy/sync'),
  disconnect: () => call<void>('DELETE', '/ritmo/hevy'),
  sendRoutine: (day: string) => call<SentRoutine>('POST', '/ritmo/hevy/routines', { body: { day } }),
};

const ERROR_TEXT: Record<string, string> = {
  RITMO_HEVY_KEY_INVALID: 'Hevy no reconoce esa clave. Revisa que la has copiado entera y que tu cuenta es Pro.',
  RITMO_HEVY_RATE_LIMIT: 'Hevy está limitando las peticiones. Prueba otra vez en unos minutos.',
  RITMO_HEVY_UNAVAILABLE: 'No hemos podido hablar con Hevy. Prueba otra vez en un rato.',
  RITMO_HEVY_NOT_CONNECTED: 'Conecta Hevy primero.',
  RITMO_HEVY_NOT_STRENGTH: 'Solo se envían a Hevy las sesiones de fuerza.',
  RITMO_HEVY_NO_SOURCE_SESSION: 'Aún no tienes ningún entreno de fuerza con series del que copiar la rutina.',
  RITMO_HEVY_NO_MATCHING_EXERCISES: 'Ninguno de los ejercicios de tu último entreno existe en Hevy.',
  RITMO_PLANNED_SESSION_NOT_FOUND: 'Guarda la sesión antes de enviarla.',
};

/** Texto para el usuario de un fallo de la conexión con Hevy. */
export function hevyErrorText(e: unknown): string | undefined {
  if (!isApiError(e)) return undefined;
  return ERROR_TEXT[e.code] ?? ERROR_TEXT[e.message] ?? e.message;
}

/** "3 nuevos · 1 actualizado", o que no había nada. */
export function syncSummary(r: HevySyncResult): string {
  const parts: string[] = [];
  if (r.imported) parts.push(`${r.imported} ${r.imported === 1 ? 'entreno nuevo' : 'entrenos nuevos'}`);
  if (r.updated) parts.push(`${r.updated} ${r.updated === 1 ? 'actualizado' : 'actualizados'}`);
  if (r.deleted) parts.push(`${r.deleted} ${r.deleted === 1 ? 'borrado' : 'borrados'}`);
  return parts.length ? parts.join(' · ') : 'No había nada nuevo';
}

export function useHevyStatus() {
  const [status, setStatus] = useState<HevyStatus | null>(null);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    hevyApi
      .status()
      .then((s) => alive && (setStatus(s), setError(false)))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [tick]);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { status, setStatus, error, reload };
}

const AUTO_SYNC_EVERY_MS = 3 * 60 * 60 * 1000;
let autoSynced = false;

/**
 * Trae lo nuevo de Hevy al abrir la app, una vez por sesión y solo si la última
 * sincronización es antigua. Es silencioso: si falla, se verá en Conexiones.
 */
export function useHevyAutoSync() {
  useEffect(() => {
    if (autoSynced) return;
    autoSynced = true;
    void hevyApi
      .status()
      .then((s) => {
        const stale = !s.lastSyncAt || Date.now() - Date.parse(s.lastSyncAt) > AUTO_SYNC_EVERY_MS;
        if (s.connected && stale) return hevyApi.sync();
        return undefined;
      })
      .catch(() => undefined);
  }, []);
}
