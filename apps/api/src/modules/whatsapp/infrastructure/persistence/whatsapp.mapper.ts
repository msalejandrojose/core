import type {
  WhatsappConversation as PrismaConversation,
  WhatsappMessage as PrismaMessage,
} from '../../../../generated/prisma/client';
import type { WhatsappConversation } from '../../domain/entities/whatsapp-conversation.entity';
import type {
  WhatsappMessage,
  WhatsappMessageStatus,
} from '../../domain/entities/whatsapp-message.entity';

export const WhatsappMapper = {
  conversationToDomain(row: PrismaConversation): WhatsappConversation {
    return {
      id: row.id,
      accountId: row.accountId,
      contactPhone: row.contactPhone,
      contactName: row.contactName,
      lastMessageAt: row.lastMessageAt,
      lastMessagePreview: row.lastMessagePreview,
      lastDirection: row.lastDirection,
      unreadCount: row.unreadCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  },

  messageToDomain(row: PrismaMessage): WhatsappMessage {
    return {
      id: row.id,
      conversationId: row.conversationId,
      direction: row.direction,
      waMessageId: row.waMessageId,
      body: row.body,
      status: row.status as WhatsappMessageStatus,
      timestamp: row.timestamp,
      createdAt: row.createdAt,
    };
  },
};
