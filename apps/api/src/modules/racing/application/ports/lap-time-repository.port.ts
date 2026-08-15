import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { GhostSnapshot } from '../../domain/entities/ghost-snapshot';
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
  /** Solo se persiste si el use-case decide que esta vuelta es la mejor marca del jugador (TASK-221). */
  ghostSnapshots?: GhostSnapshot[] | null;
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

// Un vecino inmediato en el leaderboard QUE TIENE fantasma grabado — solo
// interesan estos para emparejar una carrera online (TASK-282/284): un
// rival sin fantasma no se puede reproducir en pista, así que no cuenta
// como candidato aunque sea el más cercano en tiempo.
export interface OnlineRaceGhostCandidate {
  userId: string;
  durationMs: number;
  ghostSnapshots: GhostSnapshot[];
}

export interface OnlineRaceGhostCandidates {
  /** El vecino justo por delante (mejor tiempo), o null si no hay ninguno así. */
  target: OnlineRaceGhostCandidate | null;
  /** El vecino justo por detrás (peor tiempo), o null si no hay ninguno así. */
  threat: OnlineRaceGhostCandidate | null;
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

  /** Los vecinos inmediatos de `durationMs` en el leaderboard del circuito,
   *  EXCLUYENDO a `userId` y limitado a quienes tienen fantasma grabado
   *  (TASK-284). La regla de negocio de qué hacer con cada uno vive en
   *  `resolveOnlineRaceRivals`, esto solo busca los candidatos. */
  findGhostRivalCandidates(
    trackId: string,
    userId: string,
    durationMs: number,
  ): Promise<OnlineRaceGhostCandidates>;

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
