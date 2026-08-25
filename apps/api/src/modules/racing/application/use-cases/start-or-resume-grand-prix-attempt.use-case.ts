import { Inject, Injectable } from '@nestjs/common';
import { GrandPrixAttempt } from '../../domain/entities/grand-prix-attempt.entity';
import { GrandPrixNotFoundError } from '../../domain/errors/grand-prix-not-found.error';
import {
  GRAND_PRIX_ATTEMPT_REPOSITORY,
  type GrandPrixAttemptRepositoryPort,
} from '../ports/grand-prix-attempt-repository.port';
import {
  GRAND_PRIX_REPOSITORY,
  type GrandPrixRepositoryPort,
} from '../ports/grand-prix-repository.port';

// TASK-247: se puede abandonar y reanudar. Si el jugador ya tiene un intento
// IN_PROGRESS de este Grand Prix, ese es el que se devuelve — no se crea uno
// nuevo. El cliente compara `attempt.results` contra `grandPrix.stages` para
// saber qué manga toca a continuación.
@Injectable()
export class StartOrResumeGrandPrixAttemptUseCase {
  constructor(
    @Inject(GRAND_PRIX_REPOSITORY)
    private readonly grandPrixes: GrandPrixRepositoryPort,
    @Inject(GRAND_PRIX_ATTEMPT_REPOSITORY)
    private readonly attempts: GrandPrixAttemptRepositoryPort,
  ) {}

  async execute(
    userId: string,
    grandPrixId: string,
  ): Promise<GrandPrixAttempt> {
    const grandPrix = await this.grandPrixes.findById(grandPrixId);
    if (!grandPrix || !grandPrix.isActive) {
      throw new GrandPrixNotFoundError(grandPrixId);
    }

    const existing = await this.attempts.findInProgress(userId, grandPrixId);
    if (existing) return existing;

    return this.attempts.start(userId, grandPrixId);
  }
}
