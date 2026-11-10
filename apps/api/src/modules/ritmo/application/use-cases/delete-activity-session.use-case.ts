import { Inject, Injectable } from '@nestjs/common';
import { RitmoActivitySessionNotFoundError } from '../../domain/errors/ritmo-activity-session-not-found.error';
import {
  RITMO_ACTIVITY_REPOSITORY,
  type RitmoActivityRepositoryPort,
} from '../ports/ritmo-activity-repository.port';
import { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';

/**
 * Borra una sesión del usuario. Se lee antes de borrar para quedarse con su
 * `loggedOn`: hace falta para refrescar el agregado de ese día, y después del
 * borrado la fila ya no está.
 */
@Injectable()
export class DeleteActivitySessionUseCase {
  constructor(
    @Inject(RITMO_ACTIVITY_REPOSITORY)
    private readonly activity: RitmoActivityRepositoryPort,
    private readonly refreshDailyLog: RefreshDailyLogUseCase,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const session = await this.activity.findSession(id, userId);
    if (!session) throw new RitmoActivitySessionNotFoundError(id);

    await this.activity.deleteSession(id, userId);
    await this.refreshDailyLog.execute(userId, session.loggedOn);
  }
}
