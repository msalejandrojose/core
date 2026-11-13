import { Inject, Injectable } from '@nestjs/common';
import type { ActivitySession } from '../../domain/entities/activity-session.entity';
import type { StrengthSet } from '../../domain/entities/performance.entity';
import { BrioActivitySessionNotFoundError } from '../../domain/errors/brio-activity-session-not-found.error';
import { BrioExerciseNotFoundError } from '../../domain/errors/brio-exercise-not-found.error';
import {
  BRIO_ACTIVITY_REPOSITORY,
  type BrioActivityRepositoryPort,
} from '../ports/brio-activity-repository.port';
import {
  BRIO_PERFORMANCE_REPOSITORY,
  type BrioPerformanceRepositoryPort,
} from '../ports/brio-performance-repository.port';

/**
 * Editar las series de un entreno ya registrado. Los motores de rendimiento
 * calculan al vuelo sobre el historial, así que no hay nada que invalidar: la
 * próxima consulta ya ve el cambio.
 */
@Injectable()
export class ReplaceSessionSetsUseCase {
  constructor(
    @Inject(BRIO_ACTIVITY_REPOSITORY)
    private readonly activity: BrioActivityRepositoryPort,
    @Inject(BRIO_PERFORMANCE_REPOSITORY)
    private readonly performance: BrioPerformanceRepositoryPort,
  ) {}

  async execute(
    sessionId: string,
    userId: string,
    sets: StrengthSet[],
  ): Promise<ActivitySession> {
    const session = await this.activity.findSession(sessionId, userId);
    if (!session) throw new BrioActivitySessionNotFoundError(sessionId);

    const missing = await this.performance.missingExercises(
      [...new Set(sets.map((s) => s.exerciseId))],
      userId,
    );
    if (missing.length) throw new BrioExerciseNotFoundError(missing[0]);

    await this.activity.replaceSets(sessionId, userId, sets);
    return (await this.activity.findSession(sessionId, userId)) ?? session;
  }
}
