import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DEVICE_REPOSITORY } from './application/ports/device-repository.port';
import { RegisterDeviceUseCase } from './application/use-cases/register-device.use-case';
import { UnregisterDeviceUseCase } from './application/use-cases/unregister-device.use-case';
import { SendPushToUserUseCase } from './application/use-cases/send-push-to-user.use-case';
import { PrismaDeviceRepository } from './infrastructure/persistence/prisma-device.repository';
import { MeDevicesController } from './infrastructure/http/me-devices.controller';
import { NotifyPushHandler } from './infrastructure/workflow/notify-push.handler';

// Registro de dispositivos push por usuario. Expone `POST/DELETE /me/devices`
// (consumido por la app mobile) y aporta el handler de workflow `notify.push`,
// que el registry de WorkflowsModule descubre vía DiscoveryService. Importa
// NotificationsModule para reutilizar `SendNotificationUseCase` (dispatcher FCM).
@Module({
  imports: [IamModule, NotificationsModule],
  controllers: [MeDevicesController],
  providers: [
    { provide: DEVICE_REPOSITORY, useClass: PrismaDeviceRepository },

    RegisterDeviceUseCase,
    UnregisterDeviceUseCase,
    SendPushToUserUseCase,

    // Handler de acción de workflow (descubierto por el registry de workflows).
    NotifyPushHandler,
  ],
})
export class DevicesModule {}
