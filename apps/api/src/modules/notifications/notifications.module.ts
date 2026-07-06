import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import { IamModule } from '../iam/iam.module';
import { MailerModule } from '../mailer/mailer.module';
import { SENDING_ACCOUNT_TYPE_REPOSITORY } from './application/ports/sending-account-type-repository.port';
import { SENDING_ACCOUNT_REPOSITORY } from './application/ports/sending-account-repository.port';
import { MESSAGE_TYPE_REPOSITORY } from './application/ports/message-type-repository.port';
import { NOTIFICATION_DELIVERY_REPOSITORY } from './application/ports/notification-delivery-repository.port';
import { CHANNEL_DISPATCHER_REGISTRY } from './application/ports/channel-dispatcher-registry.port';
import { SECRET_CIPHER } from './application/ports/secret-cipher.port';
import { CreateSendingAccountTypeUseCase } from './application/use-cases/create-sending-account-type.use-case';
import { ListSendingAccountTypesUseCase } from './application/use-cases/list-sending-account-types.use-case';
import { GetSendingAccountTypeUseCase } from './application/use-cases/get-sending-account-type.use-case';
import { CreateSendingAccountUseCase } from './application/use-cases/create-sending-account.use-case';
import { UpdateSendingAccountUseCase } from './application/use-cases/update-sending-account.use-case';
import { GetSendingAccountUseCase } from './application/use-cases/get-sending-account.use-case';
import { ListSendingAccountsUseCase } from './application/use-cases/list-sending-accounts.use-case';
import { DeleteSendingAccountUseCase } from './application/use-cases/delete-sending-account.use-case';
import { CreateMessageTypeUseCase } from './application/use-cases/create-message-type.use-case';
import { UpdateMessageTypeUseCase } from './application/use-cases/update-message-type.use-case';
import { GetMessageTypeUseCase } from './application/use-cases/get-message-type.use-case';
import { ListMessageTypesUseCase } from './application/use-cases/list-message-types.use-case';
import { DeleteMessageTypeUseCase } from './application/use-cases/delete-message-type.use-case';
import { SendNotificationUseCase } from './application/use-cases/send-notification.use-case';
import { IngestSendgridEventsUseCase } from './application/use-cases/ingest-sendgrid-events.use-case';
import { ListDeliveriesUseCase } from './application/use-cases/list-deliveries.use-case';
import { GetDeliveryUseCase } from './application/use-cases/get-delivery.use-case';
import { PrismaSendingAccountTypeRepository } from './infrastructure/persistence/prisma-sending-account-type.repository';
import { PrismaSendingAccountRepository } from './infrastructure/persistence/prisma-sending-account.repository';
import { PrismaMessageTypeRepository } from './infrastructure/persistence/prisma-message-type.repository';
import { PrismaNotificationDeliveryRepository } from './infrastructure/persistence/prisma-notification-delivery.repository';
import { NestChannelDispatcherRegistry } from './infrastructure/channels/nest-channel-dispatcher.registry';
import { EmailChannelDispatcher } from './infrastructure/channels/email-channel.dispatcher';
import { SmsChannelDispatcher } from './infrastructure/channels/sms-channel.dispatcher';
import { PushChannelDispatcher } from './infrastructure/channels/push-channel.dispatcher';
import { WhatsappChannelDispatcher } from './infrastructure/channels/whatsapp-channel.dispatcher';
import { AesSecretCipher } from './infrastructure/crypto/aes-secret-cipher';
import { NullSecretCipher } from './infrastructure/crypto/null-secret-cipher';
import { NotificationsSendHandler } from './infrastructure/workflow/notifications-send.handler';
import { SendingAccountTypesController } from './infrastructure/http/sending-account-types.controller';
import { SendingAccountsController } from './infrastructure/http/sending-accounts.controller';
import { MessageTypesController } from './infrastructure/http/message-types.controller';
import { EmailTemplatesController } from './infrastructure/http/email-templates.controller';
import { DeliveriesController } from './infrastructure/http/deliveries.controller';
import { SendgridWebhookController } from './infrastructure/http/sendgrid-webhook.controller';
import {
  SENDGRID_SIGNATURE_VERIFIER,
  SendgridSignatureVerifier,
} from './infrastructure/webhook/sendgrid-signature.verifier';

@Module({
  imports: [IamModule, MailerModule, DiscoveryModule],
  controllers: [
    SendingAccountTypesController,
    SendingAccountsController,
    MessageTypesController,
    EmailTemplatesController,
    DeliveriesController,
    SendgridWebhookController,
  ],
  providers: [
    // Ports → Adapters
    {
      provide: SENDING_ACCOUNT_TYPE_REPOSITORY,
      useClass: PrismaSendingAccountTypeRepository,
    },
    {
      provide: SENDING_ACCOUNT_REPOSITORY,
      useClass: PrismaSendingAccountRepository,
    },
    { provide: MESSAGE_TYPE_REPOSITORY, useClass: PrismaMessageTypeRepository },
    {
      provide: NOTIFICATION_DELIVERY_REPOSITORY,
      useClass: PrismaNotificationDeliveryRepository,
    },
    {
      provide: CHANNEL_DISPATCHER_REGISTRY,
      useClass: NestChannelDispatcherRegistry,
    },
    {
      // Verificador de firma del webhook de SendGrid. Sin
      // `SENDGRID_WEBHOOK_PUBLIC_KEY` la verificación queda desactivada (dev/CI).
      provide: SENDGRID_SIGNATURE_VERIFIER,
      useFactory: (config: ConfigService) =>
        new SendgridSignatureVerifier(
          config.get<string>('SENDGRID_WEBHOOK_PUBLIC_KEY'),
        ),
      inject: [ConfigService],
    },
    {
      // Cifrado de secretos en reposo. Sin `NOTIFICATIONS_ENC_KEY` cae a un
      // cipher nulo (dev/CI) que NO cifra, igual que el MailerModule con su key.
      provide: SECRET_CIPHER,
      useFactory: (config: ConfigService) => {
        const key = config.get<string>('NOTIFICATIONS_ENC_KEY');
        if (key) return new AesSecretCipher(key);
        new Logger('NotificationsModule').warn(
          'NOTIFICATIONS_ENC_KEY no definida — usando NullSecretCipher (los secretos NO se cifran en BBDD).',
        );
        return new NullSecretCipher();
      },
      inject: [ConfigService],
    },

    // Dispatchers de canal (descubiertos por el registry vía @ChannelDispatcher()).
    EmailChannelDispatcher,
    SmsChannelDispatcher,
    PushChannelDispatcher,
    WhatsappChannelDispatcher,

    // Use cases — tipos de cuenta
    CreateSendingAccountTypeUseCase,
    ListSendingAccountTypesUseCase,
    GetSendingAccountTypeUseCase,

    // Use cases — cuentas de envío
    CreateSendingAccountUseCase,
    UpdateSendingAccountUseCase,
    GetSendingAccountUseCase,
    ListSendingAccountsUseCase,
    DeleteSendingAccountUseCase,

    // Use cases — tipos de mensaje
    CreateMessageTypeUseCase,
    UpdateMessageTypeUseCase,
    GetMessageTypeUseCase,
    ListMessageTypesUseCase,
    DeleteMessageTypeUseCase,

    // Envío (usado por el preview y por el action handler de workflows).
    SendNotificationUseCase,

    // Deliverability: ingesta de eventos del webhook + lectura del log.
    IngestSendgridEventsUseCase,
    ListDeliveriesUseCase,
    GetDeliveryUseCase,

    // Action handler de workflows (lo descubre el registry de workflows).
    NotificationsSendHandler,
  ],
  exports: [SendNotificationUseCase],
})
export class NotificationsModule {}
