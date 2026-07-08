import { Inject, Injectable } from '@nestjs/common';
import {
  USER_NOTIFICATION_REPOSITORY,
  type UserNotificationRepositoryPort,
} from '../ports/user-notification-repository.port';

@Injectable()
export class MarkAllNotificationsReadUseCase {
  constructor(
    @Inject(USER_NOTIFICATION_REPOSITORY)
    private readonly repo: UserNotificationRepositoryPort,
  ) {}

  /** Devuelve cuántas notificaciones se marcaron como leídas. */
  execute(userId: string): Promise<number> {
    return this.repo.markAllRead(userId);
  }
}
