import { Inject, Injectable } from '@nestjs/common';
import type { ActivitySession } from '../../domain/entities/activity-session.entity';
import {
  BRIO_ACTIVITY_REPOSITORY,
  type BrioActivityRepositoryPort,
} from '../ports/brio-activity-repository.port';

/** Historial de entrenos, del más reciente al más antiguo, paginado por cursor. */
@Injectable()
export class ListActivitySessionsUseCase {
  constructor(
    @Inject(BRIO_ACTIVITY_REPOSITORY)
    private readonly activity: BrioActivityRepositoryPort,
  ) {}

  execute(
    userId: string,
    before: Date | null,
    limit: number,
  ): Promise<ActivitySession[]> {
    return this.activity.listSessions(userId, { before, limit });
  }
}
