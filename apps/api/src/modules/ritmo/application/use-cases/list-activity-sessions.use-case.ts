import { Inject, Injectable } from '@nestjs/common';
import type { ActivitySession } from '../../domain/entities/activity-session.entity';
import {
  RITMO_ACTIVITY_REPOSITORY,
  type RitmoActivityRepositoryPort,
} from '../ports/ritmo-activity-repository.port';

/** Historial de entrenos, del más reciente al más antiguo, paginado por día. */
@Injectable()
export class ListActivitySessionsUseCase {
  constructor(
    @Inject(RITMO_ACTIVITY_REPOSITORY)
    private readonly activity: RitmoActivityRepositoryPort,
  ) {}

  execute(
    userId: string,
    beforeDay: string | null,
    limit: number,
  ): Promise<ActivitySession[]> {
    return this.activity.listSessions(userId, { beforeDay, limit });
  }
}
