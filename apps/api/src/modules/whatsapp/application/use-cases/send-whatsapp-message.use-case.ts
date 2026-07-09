import { Inject, Injectable } from '@nestjs/common';
import { WhatsappChannelDispatcher } from '../../../notifications/infrastructure/channels/whatsapp-channel.dispatcher';
import type { WhatsappMessage } from '../../domain/entities/whatsapp-message.entity';
import {
  WhatsappAccountNotFoundError,
  WhatsappConversationNotFoundError,
  WhatsappSendFailedError,
} from '../../domain/errors/whatsapp-errors';
import {
  WHATSAPP_CONVERSATION_REPOSITORY,
  type WhatsappConversationRepositoryPort,
} from '../ports/whatsapp-conversation-repository.port';
import {
  WHATSAPP_ACCOUNT_RESOLVER,
  type WhatsappAccountResolverPort,
} from '../ports/whatsapp-account-resolver.port';
import { RecordWhatsappMessageService } from '../services/record-whatsapp-message.service';

export interface SendWhatsappMessageInput {
  conversationId: string;
  body: string;
}

// Envía un mensaje de texto a una conversación existente. El envío real lo hace
// el `WhatsappChannelDispatcher` del módulo `notifications` (Meta Cloud API);
// aquí solo resolvemos la cuenta (con su token descifrado) y persistimos +
// emitimos el saliente. En dev/CI sin credenciales el dispatcher hace stub y
// devuelve vacío: el mensaje igualmente queda registrado (wamid null).
@Injectable()
export class SendWhatsappMessageUseCase {
  constructor(
    @Inject(WHATSAPP_CONVERSATION_REPOSITORY)
    private readonly conversations: WhatsappConversationRepositoryPort,
    @Inject(WHATSAPP_ACCOUNT_RESOLVER)
    private readonly accounts: WhatsappAccountResolverPort,
    private readonly dispatcher: WhatsappChannelDispatcher,
    private readonly recorder: RecordWhatsappMessageService,
  ) {}

  async execute(input: SendWhatsappMessageInput): Promise<WhatsappMessage> {
    const conversation = await this.conversations.findById(input.conversationId);
    if (!conversation) {
      throw new WhatsappConversationNotFoundError(input.conversationId);
    }

    const account = await this.accounts.getById(conversation.accountId);
    if (!account) {
      throw new WhatsappAccountNotFoundError(conversation.accountId);
    }

    let providerMessageId: string | undefined;
    try {
      const res = await this.dispatcher.dispatch(
        {
          id: account.id,
          name: account.name,
          channel: 'WHATSAPP',
          config: account.config,
        },
        { to: conversation.contactPhone, content: { body: input.body } },
      );
      providerMessageId = res.providerMessageId;
    } catch (err) {
      throw new WhatsappSendFailedError(err);
    }

    const { message } = await this.recorder.record({
      accountId: conversation.accountId,
      contactPhone: conversation.contactPhone,
      contactName: conversation.contactName,
      direction: 'OUTBOUND',
      waMessageId: providerMessageId ?? null,
      body: input.body,
      status: 'sent',
      timestamp: new Date(),
    });
    return message;
  }
}
