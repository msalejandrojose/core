import { Inject, Injectable } from '@nestjs/common';
import { UserNotification } from '../../domain/entities/user-notification.entity';
import {
  USER_NOTIFICATION_REPOSITORY,
  type UserNotificationRepositoryPort,
} from '../ports/user-notification-repository.port';

export interface CreateUserNotificationInput {
  userId: string;
  title: string;
  body?: string | null;
  kind?: string;
  data?: unknown;
}

// Crea una notificación in-app para un usuario. La usa el handler de workflow
// `notify.inApp`, y está disponible para cualquier módulo de dominio que
// quiera empujar una notificación al inbox de un usuario.
@Injectable()
export class CreateUserNotificationUseCase {
  constructor(
    @Inject(USER_NOTIFICATION_REPOSITORY)
    private readonly repo: UserNotificationRepositoryPort,
  ) {}

  execute(input: CreateUserNotificationInput): Promise<UserNotification> {
    return this.repo.create({
      userId: input.userId,
      kind: input.kind?.trim() || 'system',
      title: input.title,
      body: input.body ?? null,
      data: input.data ?? null,
    });
  }
}
