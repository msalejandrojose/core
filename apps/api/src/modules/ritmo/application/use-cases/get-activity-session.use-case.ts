import { Inject, Injectable } from '@nestjs/common';
import type { ActivitySession } from '../../domain/entities/activity-session.entity';
import { RitmoActivitySessionNotFoundError } from '../../domain/errors/ritmo-activity-session-not-found.error';
import {
  RITMO_ACTIVITY_REPOSITORY,
  type RitmoActivityRepositoryPort,
} from '../ports/ritmo-activity-repository.port';

@Injectable()
export class GetActivitySessionUseCase {
  constructor(
    @Inject(RITMO_ACTIVITY_REPOSITORY)
    private readonly activity: RitmoActivityRepositoryPort,
  ) {}

  async execute(id: string, userId: string): Promise<ActivitySession> {
    const session = await this.activity.findSession(id, userId);
    if (!session) throw new RitmoActivitySessionNotFoundError(id);
    return session;
  }
}
