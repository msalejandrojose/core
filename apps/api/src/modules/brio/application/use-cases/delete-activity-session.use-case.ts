import { Inject, Injectable } from '@nestjs/common';
import { BrioActivitySessionNotFoundError } from '../../domain/errors/brio-activity-session-not-found.error';
import {
  BRIO_ACTIVITY_REPOSITORY,
  type BrioActivityRepositoryPort,
} from '../ports/brio-activity-repository.port';
import { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';

/**
 * Borra una sesión del usuario. Se lee antes de borrar para quedarse con su
 * `loggedOn`: hace falta para refrescar el agregado de ese día, y después del
 * borrado la fila ya no está.
 */
@Injectable()
export class DeleteActivitySessionUseCase {
  constructor(
    @Inject(BRIO_ACTIVITY_REPOSITORY)
    private readonly activity: BrioActivityRepositoryPort,
    private readonly refreshDailyLog: RefreshDailyLogUseCase,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const session = await this.activity.findSession(id, userId);
    if (!session) throw new BrioActivitySessionNotFoundError(id);

    await this.activity.deleteSession(id, userId);
    await this.refreshDailyLog.execute(userId, session.loggedOn);
  }
}
