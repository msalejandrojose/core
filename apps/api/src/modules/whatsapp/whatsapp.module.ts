import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsModule } from '../notifications/notifications.module';
import { WHATSAPP_CONVERSATION_REPOSITORY } from './application/ports/whatsapp-conversation-repository.port';
import { WHATSAPP_MESSAGE_REPOSITORY } from './application/ports/whatsapp-message-repository.port';
import { WHATSAPP_ACCOUNT_RESOLVER } from './application/ports/whatsapp-account-resolver.port';
import { WHATSAPP_REALTIME } from './application/ports/whatsapp-realtime.port';
import { RecordWhatsappMessageService } from './application/services/record-whatsapp-message.service';
import { IngestInboundWebhookUseCase } from './application/use-cases/ingest-inbound-webhook.use-case';
import { SendWhatsappMessageUseCase } from './application/use-cases/send-whatsapp-message.use-case';
import { ListConversationsUseCase } from './application/use-cases/list-conversations.use-case';
import { ListMessagesUseCase } from './application/use-cases/list-messages.use-case';
import { MarkConversationReadUseCase } from './application/use-cases/mark-conversation-read.use-case';
import { ListWhatsappAccountsUseCase } from './application/use-cases/list-accounts.use-case';
import { PrismaWhatsappConversationRepository } from './infrastructure/persistence/prisma-whatsapp-conversation.repository';
import { PrismaWhatsappMessageRepository } from './infrastructure/persistence/prisma-whatsapp-message.repository';
import { NotificationsWhatsappAccountResolver } from './infrastructure/account/notifications-whatsapp-account.resolver';
import { MetaSignatureVerifier } from './infrastructure/webhook/meta-signature.verifier';
import { WhatsappGateway } from './infrastructure/realtime/whatsapp.gateway';
import { WhatsappWebhookController } from './infrastructure/http/whatsapp-webhook.controller';
import { WhatsappController } from './infrastructure/http/whatsapp.controller';

// Bandeja de conversaciones de WhatsApp en tiempo real. El envío saliente y la
// resolución/descifrado de cuentas se reutilizan de `NotificationsModule`; el
// JwtModule (mismo JWT_SECRET que la API) autentica las conexiones WebSocket.
@Module({
  imports: [
    NotificationsModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [WhatsappWebhookController, WhatsappController],
  providers: [
    { provide: WHATSAPP_CONVERSATION_REPOSITORY, useClass: PrismaWhatsappConversationRepository },
    { provide: WHATSAPP_MESSAGE_REPOSITORY, useClass: PrismaWhatsappMessageRepository },
    { provide: WHATSAPP_ACCOUNT_RESOLVER, useClass: NotificationsWhatsappAccountResolver },
    // El gateway ES la salida en tiempo real: se expone también por el token del
    // puerto para que los use cases lo inyecten sin conocer socket.io.
    WhatsappGateway,
    { provide: WHATSAPP_REALTIME, useExisting: WhatsappGateway },
    MetaSignatureVerifier,
    RecordWhatsappMessageService,
    IngestInboundWebhookUseCase,
    SendWhatsappMessageUseCase,
    ListConversationsUseCase,
    ListMessagesUseCase,
    MarkConversationReadUseCase,
    ListWhatsappAccountsUseCase,
  ],
})
export class WhatsappModule {}
