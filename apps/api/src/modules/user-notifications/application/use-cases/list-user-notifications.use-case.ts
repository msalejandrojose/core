import { Inject, Injectable } from '@nestjs/common';
import { CursorPage } from '../../../../shared/pagination';
import { UserNotification } from '../../domain/entities/user-notification.entity';
import {
  USER_NOTIFICATION_REPOSITORY,
  type UserNotificationRepositoryPort,
} from '../ports/user-notification-repository.port';

export interface ListUserNotificationsInput {
  userId: string;
  limit: number;
  cursor?: string;
  unreadOnly?: boolean;
}

@Injectable()
export class ListUserNotificationsUseCase {
  constructor(
    @Inject(USER_NOTIFICATION_REPOSITORY)
    private readonly repo: UserNotificationRepositoryPort,
  ) {}

  execute(
    input: ListUserNotificationsInput,
  ): Promise<CursorPage<UserNotification>> {
    return this.repo.list(input);
  }
}
