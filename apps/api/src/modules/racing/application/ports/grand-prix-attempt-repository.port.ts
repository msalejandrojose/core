import { GrandPrixAttempt } from '../../domain/entities/grand-prix-attempt.entity';
import { GrandPrixLeaderboardEntry } from '../../domain/entities/grand-prix-leaderboard-entry.entity';

export const GRAND_PRIX_ATTEMPT_REPOSITORY = Symbol(
  'RACING_GRAND_PRIX_ATTEMPT_REPOSITORY',
);

export interface GrandPrixAttemptRepositoryPort {
  findById(id: string): Promise<GrandPrixAttempt | null>;
  /** El intento IN_PROGRESS de este jugador para este Grand Prix, si hay uno — es el que se reanuda. */
  findInProgress(
    userId: string,
    grandPrixId: string,
  ): Promise<GrandPrixAttempt | null>;
  start(userId: string, grandPrixId: string): Promise<GrandPrixAttempt>;
  /** Añade el resultado de una manga al intento. No decide si se completa: eso lo hace el use-case. */
  addStageResult(
    attemptId: string,
    trackId: string,
    durationMs: number,
  ): Promise<GrandPrixAttempt>;
  /** Cierra el intento como COMPLETED con el total ya calculado por el use-case. */
  complete(
    attemptId: string,
    totalDurationMs: number,
  ): Promise<GrandPrixAttempt>;
  /** Un jugador por fila, su mejor intento COMPLETED, ordenado por total ascendente. */
  leaderboard(
    grandPrixId: string,
    limit: number,
  ): Promise<GrandPrixLeaderboardEntry[]>;
  /** Posición del jugador contando JUGADORES por delante, no intentos. */
  positionOf(grandPrixId: string, userId: string): Promise<number | null>;
}
