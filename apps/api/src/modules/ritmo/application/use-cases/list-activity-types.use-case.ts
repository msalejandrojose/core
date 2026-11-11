import { Inject, Injectable } from '@nestjs/common';
import type { ActivityType } from '../../domain/entities/activity-type.entity';
import {
  RITMO_ACTIVITY_REPOSITORY,
  type RitmoActivityRepositoryPort,
} from '../ports/ritmo-activity-repository.port';

@Injectable()
export class ListActivityTypesUseCase {
  constructor(
    @Inject(RITMO_ACTIVITY_REPOSITORY)
    private readonly activity: RitmoActivityRepositoryPort,
  ) {}

  execute(userId: string): Promise<ActivityType[]> {
    return this.activity.listTypesVisibleTo(userId);
  }
}
