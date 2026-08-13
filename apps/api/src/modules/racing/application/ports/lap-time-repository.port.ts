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
}
