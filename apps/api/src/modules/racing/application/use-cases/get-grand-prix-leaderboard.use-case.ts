import { Inject, Injectable } from '@nestjs/common';
import { GrandPrixLeaderboardEntry } from '../../domain/entities/grand-prix-leaderboard-entry.entity';
import { GrandPrixNotFoundError } from '../../domain/errors/grand-prix-not-found.error';
import {
  GRAND_PRIX_ATTEMPT_REPOSITORY,
  type GrandPrixAttemptRepositoryPort,
} from '../ports/grand-prix-attempt-repository.port';
import {
  GRAND_PRIX_REPOSITORY,
  type GrandPrixRepositoryPort,
} from '../ports/grand-prix-repository.port';

export interface GrandPrixLeaderboardResult {
  entries: GrandPrixLeaderboardEntry[];
  /** Posición del jugador que consulta, aunque quede fuera del top. */
  yourPosition: number | null;
}

@Injectable()
export class GetGrandPrixLeaderboardUseCase {
  constructor(
    @Inject(GRAND_PRIX_REPOSITORY)
    private readonly grandPrixes: GrandPrixRepositoryPort,
    @Inject(GRAND_PRIX_ATTEMPT_REPOSITORY)
    private readonly attempts: GrandPrixAttemptRepositoryPort,
  ) {}

  async execute(
    grandPrixId: string,
    userId: string,
    limit: number,
  ): Promise<GrandPrixLeaderboardResult> {
    const grandPrix = await this.grandPrixes.findById(grandPrixId);
    if (!grandPrix) throw new GrandPrixNotFoundError(grandPrixId);

    const [entries, yourPosition] = await Promise.all([
      this.attempts.leaderboard(grandPrixId, limit),
      this.attempts.positionOf(grandPrixId, userId),
    ]);

    return { entries, yourPosition };
  }
}
