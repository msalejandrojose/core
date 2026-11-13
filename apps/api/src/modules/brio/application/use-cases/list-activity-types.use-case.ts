import { Inject, Injectable } from '@nestjs/common';
import type { ActivityType } from '../../domain/entities/activity-type.entity';
import {
  BRIO_ACTIVITY_REPOSITORY,
  type BrioActivityRepositoryPort,
} from '../ports/brio-activity-repository.port';

@Injectable()
export class ListActivityTypesUseCase {
  constructor(
    @Inject(BRIO_ACTIVITY_REPOSITORY)
    private readonly activity: BrioActivityRepositoryPort,
  ) {}

  execute(userId: string): Promise<ActivityType[]> {
    return this.activity.listTypesVisibleTo(userId);
  }
}
