import { Injectable } from '@nestjs/common';
import { CreateUserNotificationUseCase } from '../../../user-notifications/application/use-cases/create-user-notification.use-case';
import { NotifierPort, NotifyInput } from '../../application/ports/notifier.port';

@Injectable()
export class UserNotificationAdapter implements NotifierPort {
  constructor(
    private readonly createNotification: CreateUserNotificationUseCase,
  ) {}

  async notify(input: NotifyInput): Promise<void> {
    await this.createNotification.execute({
      userId: input.userId,
      kind: input.kind,
      title: input.title,
      body: input.body,
      data: input.data,
    });
  }
}
