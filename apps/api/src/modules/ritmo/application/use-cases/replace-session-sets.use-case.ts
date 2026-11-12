import { Inject, Injectable } from '@nestjs/common';
import type { ActivitySession } from '../../domain/entities/activity-session.entity';
import type { StrengthSet } from '../../domain/entities/performance.entity';
import { RitmoActivitySessionNotFoundError } from '../../domain/errors/ritmo-activity-session-not-found.error';
import { RitmoExerciseNotFoundError } from '../../domain/errors/ritmo-exercise-not-found.error';
import {
  RITMO_ACTIVITY_REPOSITORY,
  type RitmoActivityRepositoryPort,
} from '../ports/ritmo-activity-repository.port';
import {
  RITMO_PERFORMANCE_REPOSITORY,
  type RitmoPerformanceRepositoryPort,
} from '../ports/ritmo-performance-repository.port';

/**
 * Editar las series de un entreno ya registrado. Los motores de rendimiento
 * calculan al vuelo sobre el historial, así que no hay nada que invalidar: la
 * próxima consulta ya ve el cambio.
 */
@Injectable()
export class ReplaceSessionSetsUseCase {
  constructor(
    @Inject(RITMO_ACTIVITY_REPOSITORY)
    private readonly activity: RitmoActivityRepositoryPort,
    @Inject(RITMO_PERFORMANCE_REPOSITORY)
    private readonly performance: RitmoPerformanceRepositoryPort,
  ) {}

  async execute(
    sessionId: string,
    userId: string,
    sets: StrengthSet[],
  ): Promise<ActivitySession> {
    const session = await this.activity.findSession(sessionId, userId);
    if (!session) throw new RitmoActivitySessionNotFoundError(sessionId);

    const missing = await this.performance.missingExercises(
      [...new Set(sets.map((s) => s.exerciseId))],
      userId,
    );
    if (missing.length) throw new RitmoExerciseNotFoundError(missing[0]);

    await this.activity.replaceSets(sessionId, userId, sets);
    return (await this.activity.findSession(sessionId, userId)) ?? session;
  }
}
