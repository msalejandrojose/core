import { Inject, Injectable } from '@nestjs/common';
import type { WhatsappMessage } from '../../domain/entities/whatsapp-message.entity';
import { WhatsappConversationNotFoundError } from '../../domain/errors/whatsapp-errors';
import {
  WHATSAPP_CONVERSATION_REPOSITORY,
  type WhatsappConversationRepositoryPort,
} from '../ports/whatsapp-conversation-repository.port';
import {
  WHATSAPP_MESSAGE_REPOSITORY,
  type WhatsappMessageRepositoryPort,
} from '../ports/whatsapp-message-repository.port';

export interface ListMessagesInput {
  conversationId: string;
  limit?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

@Injectable()
export class ListMessagesUseCase {
  constructor(
    @Inject(WHATSAPP_CONVERSATION_REPOSITORY)
    private readonly conversations: WhatsappConversationRepositoryPort,
    @Inject(WHATSAPP_MESSAGE_REPOSITORY)
    private readonly messages: WhatsappMessageRepositoryPort,
  ) {}

  async execute(input: ListMessagesInput): Promise<WhatsappMessage[]> {
    const conversation = await this.conversations.findById(input.conversationId);
    if (!conversation) {
      throw new WhatsappConversationNotFoundError(input.conversationId);
    }
    const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    return this.messages.listByConversation(input.conversationId, limit);
  }
}
