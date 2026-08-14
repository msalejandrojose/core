import { PaginatedResult } from '../../../../shared/types/paginated-result';
import {
  LapTime,
  LeaderboardEntry,
} from '../../domain/entities/lap-time.entity';

export const LAP_TIME_REPOSITORY = Symbol('RACING_LAP_TIME_REPOSITORY');

export interface CreateLapTimeData {
  userId: string;
  trackId: string;
  durationMs: number;
  splitsMs: number[];
  clientVersion: string;
}

export interface AdminListLapTimesOptions {
  page: number;
  limit: number;
  trackId?: string;
  userId?: string;
}

// Fila enriquecida para el backoffice (TASK-246): a diferencia de `LapTime`
// (dominio puro) trae ya el nombre del circuito y del jugador — igual que
// `LeaderboardEntry` los junta para el ranking, esta los junta para la vista
// admin de "todos los intentos".
export interface AdminLapTimeListEntry {
  id: string;
  userId: string;
  userEmail: string;
  userDisplayName: string;
  trackId: string;
  trackSlug: string;
  trackName: string;
  durationMs: number;
  splitsMs: number[];
  clientVersion: string;
  createdAt: Date;
  invalidatedAt: Date | null;
  /** Es el mejor tiempo VÁLIDO de ese jugador en ese circuito (con empates,
   *  varias filas pueden llevar `true` a la vez). */
  isPersonalBest: boolean;
}

// Resumen por circuito para la ficha de usuario (TASK-251): a diferencia de
// `AdminLapTimeListEntry` (una fila por intento), esta es una fila por
// circuito ya agregada. `bestDurationMs` es null si el jugador solo tiene
// intentos anulados en ese circuito.
export interface AdminUserTrackSummary {
  trackId: string;
  trackSlug: string;
  trackName: string;
  attempts: number;
  bestDurationMs: number | null;
}

export interface LapTimeRepositoryPort {
  create(data: CreateLapTimeData): Promise<LapTime>;

  findById(id: string): Promise<LapTime | null>;

  /** Anula el tiempo sin borrarlo (TASK-239/242): deja constancia y lo saca
   *  del leaderboard, la posición y la mejor marca personal. */
  invalidate(id: string): Promise<LapTime>;

  /** Mejor tiempo VÁLIDO de un jugador en un circuito, o null si no tiene. */
  findPersonalBest(userId: string, trackId: string): Promise<LapTime | null>;

  /** Último intento de un jugador, sea del circuito que sea — incluye
   *  anulados: el anti-cheat mide tiempo transcurrido, no validez. */
  findLastAttemptAt(userId: string): Promise<Date | null>;

  /** Top del circuito entre tiempos VÁLIDOS: un jugador aparece una sola vez,
   *  con su mejor marca. */
  leaderboard(trackId: string, limit: number): Promise<LeaderboardEntry[]>;

  /** Posición de un jugador en ese mismo ranking, o null si no tiene tiempo
   *  válido. Se cuenta por MEJOR tiempo de cada jugador, no por número de
   *  filas. */
  positionOf(trackId: string, userId: string): Promise<number | null>;

  /** Listado de administración: TODOS los intentos (válidos e inválidos),
   *  sin los límites de tamaño del leaderboard del jugador. */
  listAllAdmin(
    opts: AdminListLapTimesOptions,
  ): Promise<PaginatedResult<AdminLapTimeListEntry>>;

  /** Un jugador, agrupado por circuito: en cuáles tiene al menos un intento,
   *  cuántos, y su mejor tiempo válido (TASK-251). La posición en el ranking
   *  de cada circuito se calcula aparte con `positionOf`. */
  summarizeForUserAdmin(userId: string): Promise<AdminUserTrackSummary[]>;
}
