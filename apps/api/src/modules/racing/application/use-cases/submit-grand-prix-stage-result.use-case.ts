import { Inject, Injectable } from '@nestjs/common';
import { GrandPrixAttempt } from '../../domain/entities/grand-prix-attempt.entity';
import { GrandPrixAttemptNotInProgressError } from '../../domain/errors/grand-prix-attempt-not-in-progress.error';
import { GrandPrixAttemptStageMismatchError } from '../../domain/errors/grand-prix-attempt-stage-mismatch.error';
import { GrandPrixNotFoundError } from '../../domain/errors/grand-prix-not-found.error';
import {
  GRAND_PRIX_ATTEMPT_REPOSITORY,
  type GrandPrixAttemptRepositoryPort,
} from '../ports/grand-prix-attempt-repository.port';
import {
  GRAND_PRIX_REPOSITORY,
  type GrandPrixRepositoryPort,
} from '../ports/grand-prix-repository.port';

export interface SubmitGrandPrixStageResultInput {
  userId: string;
  grandPrixId: string;
  trackId: string;
  durationMs: number;
}

@Injectable()
export class SubmitGrandPrixStageResultUseCase {
  constructor(
    @Inject(GRAND_PRIX_REPOSITORY)
    private readonly grandPrixes: GrandPrixRepositoryPort,
    @Inject(GRAND_PRIX_ATTEMPT_REPOSITORY)
    private readonly attempts: GrandPrixAttemptRepositoryPort,
  ) {}

  async execute(
    input: SubmitGrandPrixStageResultInput,
  ): Promise<GrandPrixAttempt> {
    const grandPrix = await this.grandPrixes.findById(input.grandPrixId);
    if (!grandPrix) throw new GrandPrixNotFoundError(input.grandPrixId);

    const attempt = await this.attempts.findInProgress(
      input.userId,
      input.grandPrixId,
    );
    if (!attempt) {
      throw new GrandPrixAttemptNotInProgressError(
        input.userId,
        input.grandPrixId,
      );
    }

    // Las mangas se disputan en el orden fijado por el Grand Prix, sin
    // saltos: la siguiente pendiente es la primera manga que no aparezca
    // todavía entre los resultados ya subidos.
    const completedTrackIds = new Set(attempt.results.map((r) => r.trackId));
    const nextStage = grandPrix.stages.find(
      (s) => !completedTrackIds.has(s.trackId),
    );

    if (!nextStage || nextStage.trackId !== input.trackId) {
      throw new GrandPrixAttemptStageMismatchError(
        attempt.id,
        nextStage?.trackId ?? null,
      );
    }

    const updated = await this.attempts.addStageResult(
      attempt.id,
      input.trackId,
      input.durationMs,
    );

    const isLastStage = updated.results.length === grandPrix.stages.length;
    if (!isLastStage) return updated;

    const totalDurationMs = updated.results.reduce(
      (sum, r) => sum + r.durationMs,
      0,
    );
    return this.attempts.complete(attempt.id, totalDurationMs);
  }
}
