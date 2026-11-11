import { Inject, Injectable } from '@nestjs/common';
import type { ActivityType } from '../../domain/entities/activity-type.entity';
import {
  NUTRE_ACTIVITY_REPOSITORY,
  type NutreActivityRepositoryPort,
} from '../ports/nutre-activity-repository.port';

@Injectable()
export class ListActivityTypesUseCase {
  constructor(
    @Inject(NUTRE_ACTIVITY_REPOSITORY)
    private readonly activity: NutreActivityRepositoryPort,
  ) {}

  execute(userId: string): Promise<ActivityType[]> {
    return this.activity.listTypesVisibleTo(userId);
  }
}
