import { Inject, Injectable } from '@nestjs/common';
import { UserNotification } from '../../domain/entities/user-notification.entity';
import { NotificationNotFoundError } from '../../domain/errors/notification-not-found.error';
import {
  USER_NOTIFICATION_REPOSITORY,
  type UserNotificationRepositoryPort,
} from '../ports/user-notification-repository.port';

@Injectable()
export class MarkNotificationReadUseCase {
  constructor(
    @Inject(USER_NOTIFICATION_REPOSITORY)
    private readonly repo: UserNotificationRepositoryPort,
  ) {}

  async execute(id: string, userId: string): Promise<UserNotification> {
    const updated = await this.repo.markRead(id, userId);
    if (!updated) throw new NotificationNotFoundError(id);
    return updated;
  }
}
