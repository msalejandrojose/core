import { useCallback, useEffect, useState } from 'react';
import { getAuthToken } from '@/store/auth.store';
import { call, isApiError, type RitmoApiError } from '../api';

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

/** Resultado de subir el CSV que exporta Hevy. */
export interface HevyCsvImportResult {
  imported: number;
  updated: number;
  alreadySynced: number;
  firstDay: string | null;
  lastDay: string | null;
  matchedExercises: number;
  createdExercises: string[];
  createdTemplates: string[];
  timeOnlySets: number;
  badRows: number;
}

/** Sube el CSV (multipart: el cliente tipado solo manda JSON). */
async function importCsv(file: File): Promise<HevyCsvImportResult> {
  const token = getAuthToken();
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${import.meta.env.VITE_API_URL}/v1/ritmo/hevy/import-csv`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const body = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const b = body as { code?: string; message?: string } | null;
    const err: RitmoApiError = {
      code: b?.code ?? (res.status === 413 ? 'RITMO_HEVY_CSV_TOO_BIG' : 'UNKNOWN'),
      message: b?.message ?? 'No se pudo importar el archivo.',
      status: res.status,
    };
    throw err;
  }
  return body as HevyCsvImportResult;
}

export const hevyApi = {
  importCsv,
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
  RITMO_HEVY_CSV_INVALID: 'Ese archivo no parece el CSV de entrenos de Hevy. Expórtalo desde Hevy: Perfil → Ajustes → Exportar e importar datos → Exportar entrenos.',
  RITMO_HEVY_CSV_EMPTY: 'El archivo no tiene ningún entreno con series.',
  RITMO_HEVY_CSV_TOO_BIG: 'El archivo es demasiado grande (máximo 5 MB).',
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

/** "147 entrenos nuevos · 4 plantillas", para el aviso tras importar el CSV. */
export function csvImportSummary(r: HevyCsvImportResult): string {
  const parts: string[] = [];
  if (r.imported) parts.push(`${r.imported} ${r.imported === 1 ? 'entreno nuevo' : 'entrenos nuevos'}`);
  if (r.updated) parts.push(`${r.updated} ${r.updated === 1 ? 'ya estaba' : 'ya estaban'}`);
  if (r.alreadySynced) parts.push(`${r.alreadySynced} ya llegaron por la conexión`);
  if (r.createdTemplates.length)
    parts.push(`${r.createdTemplates.length} ${r.createdTemplates.length === 1 ? 'plantilla' : 'plantillas'}`);
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
