import { useCallback, useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { Health, type HealthDataType } from '@capgo/capacitor-health';
import { call } from '../api';
import { buildDays, toWorkouts, type DeviceDay, type DeviceWorkout, type RawSample } from './device-health.aggregate';

/**
 * Apple Salud (iPhone) y Health Connect (Android). El teléfono guarda los
 * permisos y lee los datos; Brío solo recibe lo agrupado por día y los
 * entrenos. En la web no existe.
 */

export type DevicePlatform = 'ios' | 'android';

export interface HealthDeviceStatus {
  connected: boolean;
  platform: DevicePlatform | null;
  lastSyncAt: string | null;
  lastSyncDays: number | null;
  lastSyncWorkouts: number | null;
}

export interface DeviceHealthResult {
  healthDays: number;
  weights: number;
  imported: number;
  updated: number;
  skipped: number;
}

const READ: HealthDataType[] = ['steps', 'restingHeartRate', 'heartRateVariability', 'sleep', 'weight', 'workouts'];

/** Primera lectura: estos días hacia atrás (Health Connect sin permiso de historial da ~30). */
const FIRST_DAYS = 90;
/** En cada sincronización se repasan los últimos días: el reloj vuelca la noche con retraso. */
const RESYNC_DAYS = 3;
const AUTO_SYNC_EVERY_MS = 60 * 60 * 1000;
const MAX_SAMPLES = 10_000;

export const devicePlatform = (): DevicePlatform | null => {
  const p = Capacitor.getPlatform();
  return p === 'ios' || p === 'android' ? p : null;
};

export const deviceHealthName = (p: DevicePlatform | null = devicePlatform()) =>
  p === 'android' ? 'Health Connect' : 'Apple Salud';

export const deviceHealthApi = {
  status: () => call<HealthDeviceStatus>('GET', '/brio/health/device'),
  sync: (body: { platform: DevicePlatform; days: DeviceDay[]; workouts: DeviceWorkout[] }) =>
    call<{ status: HealthDeviceStatus; sync: DeviceHealthResult }>('POST', '/brio/health/device/sync', { body }),
  disconnect: () => call<void>('DELETE', '/brio/health/device'),
};

/** ¿Hay Salud / Health Connect en este teléfono? Con motivo si no. */
export async function deviceHealthAvailable(): Promise<{ available: boolean; reason?: string }> {
  if (!devicePlatform()) return { available: false, reason: 'Solo en la app del móvil' };
  try {
    const r = await Health.isAvailable();
    return r.available ? { available: true } : { available: false, reason: r.reason ?? 'No disponible en este teléfono' };
  } catch {
    return { available: false, reason: 'No disponible en este teléfono' };
  }
}

/** Abre la hoja de permisos del sistema. */
export async function requestDeviceHealth(): Promise<void> {
  await Health.requestAuthorization({ read: READ, requestHistoryAccess: true });
}

const samples = async (dataType: HealthDataType, startDate: string, endDate: string): Promise<RawSample[]> => {
  try {
    const r = await Health.readSamples({ dataType, startDate, endDate, limit: MAX_SAMPLES, ascending: true });
    return r.samples;
  } catch {
    // Sin permiso para ese dato (o el teléfono no lo mide): se sigue con el resto.
    return [];
  }
};

/** Lee del teléfono desde `from` hasta ahora. */
export async function readDeviceHealth(from: Date, to = new Date()) {
  const startDate = from.toISOString();
  const endDate = to.toISOString();
  const [steps, restingHr, hrv, sleep, weight, workouts] = await Promise.all([
    Health.queryAggregated({ dataType: 'steps', startDate, endDate, bucket: 'day', aggregation: 'sum' })
      .then((r) => r.samples)
      .catch(() => []),
    samples('restingHeartRate', startDate, endDate),
    samples('heartRateVariability', startDate, endDate),
    // La noche que acaba el primer día empieza la tarde anterior.
    samples('sleep', new Date(from.getTime() - 18 * 3600 * 1000).toISOString(), endDate),
    samples('weight', startDate, endDate),
    Health.queryWorkouts({ startDate, endDate, limit: 500, ascending: true })
      .then((r) => r.workouts)
      .catch(() => []),
  ]);
  return {
    days: buildDays({ steps, restingHr, hrv, sleep, weight }),
    workouts: toWorkouts(workouts),
  };
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Lee del teléfono lo que falta desde la última vez y lo manda a Brío. */
export async function syncDeviceHealth(lastSyncAt: string | null) {
  const platform = devicePlatform();
  if (!platform) throw new Error('Solo en la app del móvil');
  const from = startOfDay(
    lastSyncAt
      ? new Date(Date.parse(lastSyncAt) - RESYNC_DAYS * 24 * 3600 * 1000)
      : new Date(Date.now() - FIRST_DAYS * 24 * 3600 * 1000),
  );
  const { days, workouts } = await readDeviceHealth(from);
  return deviceHealthApi.sync({ platform, days, workouts });
}

/** "3 entrenos nuevos · 12 días de salud", o que no había nada. */
export function deviceSyncSummary(r: DeviceHealthResult): string {
  const parts: string[] = [];
  if (r.imported) parts.push(`${r.imported} ${r.imported === 1 ? 'entreno nuevo' : 'entrenos nuevos'}`);
  if (r.healthDays) parts.push(`${r.healthDays} ${r.healthDays === 1 ? 'día' : 'días'} de salud`);
  if (r.weights) parts.push(`${r.weights} ${r.weights === 1 ? 'peso' : 'pesos'}`);
  return parts.length ? parts.join(' · ') : 'No había nada nuevo';
}

export function useHealthDeviceStatus() {
  const [status, setStatus] = useState<HealthDeviceStatus | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    deviceHealthApi
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

let running = false;

async function autoSync() {
  const platform = devicePlatform();
  if (!platform || running) return;
  running = true;
  try {
    const s = await deviceHealthApi.status();
    // Solo el teléfono con el que se conectó (con dos móviles, el otro no pisa).
    if (!s.connected || s.platform !== platform) return;
    if (s.lastSyncAt && Date.now() - Date.parse(s.lastSyncAt) < AUTO_SYNC_EVERY_MS) return;
    await syncDeviceHealth(s.lastSyncAt);
  } catch {
    // En segundo plano: si falla, se reintenta la próxima vez que se abra la app.
  } finally {
    running = false;
  }
}

/** Trae lo nuevo de Salud / Health Connect al abrir la app y al volver a ella, como mucho una vez por hora. */
export function useDeviceHealthAutoSync() {
  useEffect(() => {
    if (!devicePlatform()) return;
    void autoSync();
    const sub = App.addListener('resume', () => void autoSync());
    return () => {
      void sub.then((h) => h.remove());
    };
  }, []);
}
