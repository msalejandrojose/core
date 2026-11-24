import type { BrioProfile, DaySummary } from './api';

/**
 * Última foto de Hoy (perfil + resumen del día) guardada en el dispositivo
 * para pintar la pantalla al instante al abrir la app (TASK-425). La API en
 * Cloud Run tarda segundos en despertar; mientras, se ve lo último que se
 * cargó y se refresca por detrás. Es solo una caché: si falta o es de otro
 * usuario u otro día, se ignora.
 */

const KEY = 'brio-today-snapshot';
const VERSION = 1;

export interface TodaySnapshot {
  v: number;
  userId: string;
  profile: BrioProfile;
  /** Día del resumen (`YYYY-MM-DD`) y el resumen, si se guardó uno. */
  day: string | null;
  summary: DaySummary | null;
}

export function readSnapshot(userId: string | null | undefined): TodaySnapshot | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const snap = JSON.parse(raw) as TodaySnapshot;
    return snap.v === VERSION && snap.userId === userId && snap.profile ? snap : null;
  } catch {
    return null;
  }
}

export function writeSnapshot(
  userId: string | null | undefined,
  profile: BrioProfile | null,
  day: string | null,
  summary: DaySummary | null,
): void {
  if (!userId || !profile) return;
  try {
    const snap: TodaySnapshot = { v: VERSION, userId, profile, day, summary };
    localStorage.setItem(KEY, JSON.stringify(snap));
  } catch {
    // Sin espacio o almacenamiento bloqueado: la caché es opcional.
  }
}

export function clearSnapshot(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nada que limpiar.
  }
}
