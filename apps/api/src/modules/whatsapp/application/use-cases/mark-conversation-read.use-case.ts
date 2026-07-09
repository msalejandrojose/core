import { Inject, Injectable } from '@nestjs/common';
import type { WhatsappConversation } from '../../domain/entities/whatsapp-conversation.entity';
import { WhatsappConversationNotFoundError } from '../../domain/errors/whatsapp-errors';
import {
  WHATSAPP_CONVERSATION_REPOSITORY,
  type WhatsappConversationRepositoryPort,
} from '../ports/whatsapp-conversation-repository.port';

@Injectable()
export class MarkConversationReadUseCase {
  constructor(
    @Inject(WHATSAPP_CONVERSATION_REPOSITORY)
    private readonly conversations: WhatsappConversationRepositoryPort,
  ) {}

  async execute(conversationId: string): Promise<WhatsappConversation> {
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) {
      throw new WhatsappConversationNotFoundError(conversationId);
    }
    return this.conversations.resetUnread(conversationId);
  }
}
