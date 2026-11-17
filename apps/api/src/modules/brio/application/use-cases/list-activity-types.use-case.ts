import { Inject, Injectable } from '@nestjs/common';
import type { ActivityType } from '../../domain/entities/activity-type.entity';
import {
  BRIO_ACTIVITY_REPOSITORY,
  type BrioActivityRepositoryPort,
} from '../ports/brio-activity-repository.port';

const USAGE_DAYS = 120;

@Injectable()
export class ListActivityTypesUseCase {
  constructor(
    @Inject(BRIO_ACTIVITY_REPOSITORY)
    private readonly activity: BrioActivityRepositoryPort,
  ) {}

  /**
   * Los tipos que ve la persona, cada uno con cuántas veces lo ha usado en los
   * últimos 120 días: la app pone primero «tus deportes».
   */
  async execute(
    userId: string,
    now = new Date(),
  ): Promise<(ActivityType & { myUses: number })[]> {
    const since = new Date(now.getTime() - USAGE_DAYS * 24 * 3600 * 1000);
    const [types, usage] = await Promise.all([
      this.activity.listTypesVisibleTo(userId),
      this.activity.typeUsage(userId, since),
    ]);
    return types.map((t) => ({ ...t, myUses: usage[t.id] ?? 0 }));
  }
}
