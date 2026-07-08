import { Inject, Injectable } from '@nestjs/common';
import {
  USER_NOTIFICATION_REPOSITORY,
  type UserNotificationRepositoryPort,
} from '../ports/user-notification-repository.port';

@Injectable()
export class CountUnreadNotificationsUseCase {
  constructor(
    @Inject(USER_NOTIFICATION_REPOSITORY)
    private readonly repo: UserNotificationRepositoryPort,
  ) {}

  execute(userId: string): Promise<number> {
    return this.repo.countUnread(userId);
  }
}
