import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { USER_NOTIFICATION_REPOSITORY } from './application/ports/user-notification-repository.port';
import { CreateUserNotificationUseCase } from './application/use-cases/create-user-notification.use-case';
import { CountUnreadNotificationsUseCase } from './application/use-cases/count-unread-notifications.use-case';
import { ListUserNotificationsUseCase } from './application/use-cases/list-user-notifications.use-case';
import { MarkAllNotificationsReadUseCase } from './application/use-cases/mark-all-notifications-read.use-case';
import { MarkNotificationReadUseCase } from './application/use-cases/mark-notification-read.use-case';
import { PrismaUserNotificationRepository } from './infrastructure/persistence/prisma-user-notification.repository';
import { MeNotificationsController } from './infrastructure/http/me-notifications.controller';
import { NotifyInAppHandler } from './infrastructure/workflow/notify-in-app.handler';

// Inbox de notificaciones in-app por usuario. Expone `GET/PATCH /me/notifications`
// (consumido por la app mobile) y aporta el handler de workflow `notify.inApp`,
// que el registry de WorkflowsModule descubre vía DiscoveryService.
@Module({
  imports: [IamModule],
  controllers: [MeNotificationsController],
  providers: [
    {
      provide: USER_NOTIFICATION_REPOSITORY,
      useClass: PrismaUserNotificationRepository,
    },

    ListUserNotificationsUseCase,
    CountUnreadNotificationsUseCase,
    MarkNotificationReadUseCase,
    MarkAllNotificationsReadUseCase,
    CreateUserNotificationUseCase,

    // Handler de acción de workflow (descubierto por el registry de workflows).
    NotifyInAppHandler,
  ],
  exports: [
    // Consumido por AndanzasModule (y cualquier otro módulo de dominio) para
    // empujar una notificación in-app sin duplicar la lógica de creación.
    CreateUserNotificationUseCase,
  ],
})
export class UserNotificationsModule {}
