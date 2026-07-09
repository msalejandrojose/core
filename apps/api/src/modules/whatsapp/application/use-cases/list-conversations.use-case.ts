import { Inject, Injectable } from '@nestjs/common';
import type { WhatsappConversation } from '../../domain/entities/whatsapp-conversation.entity';
import {
  WHATSAPP_CONVERSATION_REPOSITORY,
  type WhatsappConversationRepositoryPort,
} from '../ports/whatsapp-conversation-repository.port';

export interface ListConversationsInput {
  accountId?: string;
  limit?: number;
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

@Injectable()
export class ListConversationsUseCase {
  constructor(
    @Inject(WHATSAPP_CONVERSATION_REPOSITORY)
    private readonly conversations: WhatsappConversationRepositoryPort,
  ) {}

  execute(input: ListConversationsInput): Promise<WhatsappConversation[]> {
    const limit = Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    return this.conversations.list({ accountId: input.accountId, limit });
  }
}
