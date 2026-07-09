import { Inject, Injectable } from '@nestjs/common';
import type { WhatsappConversation } from '../../domain/entities/whatsapp-conversation.entity';
import type {
  WhatsappMessage,
  WhatsappMessageStatus,
} from '../../domain/entities/whatsapp-message.entity';
import type { WhatsappMessageDirection } from '../../domain/entities/whatsapp-conversation.entity';
import {
  WHATSAPP_CONVERSATION_REPOSITORY,
  type WhatsappConversationRepositoryPort,
} from '../ports/whatsapp-conversation-repository.port';
import {
  WHATSAPP_MESSAGE_REPOSITORY,
  type WhatsappMessageRepositoryPort,
} from '../ports/whatsapp-message-repository.port';
import {
  WHATSAPP_REALTIME,
  type WhatsappRealtimePort,
} from '../ports/whatsapp-realtime.port';

export interface RecordMessageInput {
  accountId: string;
  contactPhone: string;
  contactName?: string | null;
  direction: WhatsappMessageDirection;
  waMessageId: string | null;
  body: string;
  status: WhatsappMessageStatus;
  timestamp: Date;
}

export interface RecordedMessage {
  conversation: WhatsappConversation;
  message: WhatsappMessage;
}

// Punto único donde un mensaje (entrante o saliente) aterriza en la bandeja:
// garantiza la conversación, persiste el mensaje, actualiza los metadatos del
// hilo (último mensaje, no leídos) y lo emite en tiempo real. Lo comparten la
// ingesta del webhook y el envío desde el backoffice para no duplicar la lógica.
@Injectable()
export class RecordWhatsappMessageService {
  constructor(
    @Inject(WHATSAPP_CONVERSATION_REPOSITORY)
    private readonly conversations: WhatsappConversationRepositoryPort,
    @Inject(WHATSAPP_MESSAGE_REPOSITORY)
    private readonly messages: WhatsappMessageRepositoryPort,
    @Inject(WHATSAPP_REALTIME)
    private readonly realtime: WhatsappRealtimePort,
  ) {}

  async record(input: RecordMessageInput): Promise<RecordedMessage> {
    const conversation = await this.ensureConversation(
      input.accountId,
      input.contactPhone,
      input.contactName ?? null,
    );

    const message = await this.messages.create({
      conversationId: conversation.id,
      direction: input.direction,
      waMessageId: input.waMessageId,
      body: input.body,
      status: input.status,
      timestamp: input.timestamp,
    });

    const updated = await this.conversations.touch(conversation.id, {
      lastMessageAt: input.timestamp,
      lastMessagePreview: input.body.slice(0, 500),
      lastDirection: input.direction,
      incrementUnread: input.direction === 'INBOUND',
      contactName: input.contactName ?? undefined,
    });

    this.realtime.broadcastMessage({ conversation: updated, message });
    return { conversation: updated, message };
  }

  private async ensureConversation(
    accountId: string,
    contactPhone: string,
    contactName: string | null,
  ): Promise<WhatsappConversation> {
    const existing = await this.conversations.findByAccountAndContact(
      accountId,
      contactPhone,
    );
    if (existing) return existing;
    return this.conversations.create({ accountId, contactPhone, contactName });
  }
}
