import { Inject, Injectable } from '@nestjs/common';
import type { ActivitySession } from '../../domain/entities/activity-session.entity';
import { BrioActivitySessionNotFoundError } from '../../domain/errors/brio-activity-session-not-found.error';
import {
  BRIO_ACTIVITY_REPOSITORY,
  type BrioActivityRepositoryPort,
} from '../ports/brio-activity-repository.port';

@Injectable()
export class GetActivitySessionUseCase {
  constructor(
    @Inject(BRIO_ACTIVITY_REPOSITORY)
    private readonly activity: BrioActivityRepositoryPort,
  ) {}

  async execute(id: string, userId: string): Promise<ActivitySession> {
    const session = await this.activity.findSession(id, userId);
    if (!session) throw new BrioActivitySessionNotFoundError(id);
    return session;
  }
}
