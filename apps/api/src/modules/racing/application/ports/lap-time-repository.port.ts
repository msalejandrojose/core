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

  /** Mejor tiempo de un jugador en un circuito, o null si aún no tiene. */
  findPersonalBest(userId: string, trackId: string): Promise<LapTime | null>;

  /** Último intento de un jugador, sea del circuito que sea. Lo usa el
   *  anti-cheat para saber si ha dado tiempo material a correr la vuelta. */
  findLastAttemptAt(userId: string): Promise<Date | null>;

  /** Top del circuito: un jugador aparece una sola vez, con su mejor marca. */
  leaderboard(trackId: string, limit: number): Promise<LeaderboardEntry[]>;

  /** Posición de un jugador en ese mismo ranking, o null si no tiene tiempo.
   *  Se cuenta por MEJOR tiempo de cada jugador, no por número de filas. */
  positionOf(trackId: string, userId: string): Promise<number | null>;
}
