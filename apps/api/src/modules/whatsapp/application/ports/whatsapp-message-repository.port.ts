import type {
  WhatsappMessage,
  WhatsappMessageStatus,
} from '../../domain/entities/whatsapp-message.entity';
import type { WhatsappMessageDirection } from '../../domain/entities/whatsapp-conversation.entity';

export const WHATSAPP_MESSAGE_REPOSITORY = Symbol('WHATSAPP_MESSAGE_REPOSITORY');

export interface CreateMessageData {
  conversationId: string;
  direction: WhatsappMessageDirection;
  waMessageId: string | null;
  body: string;
  status: WhatsappMessageStatus;
  timestamp: Date;
}

export interface WhatsappMessageRepositoryPort {
  create(data: CreateMessageData): Promise<WhatsappMessage>;
  existsByWaMessageId(waMessageId: string): Promise<boolean>;
  listByConversation(
    conversationId: string,
    limit: number,
  ): Promise<WhatsappMessage[]>;
  /** Actualiza el estado por wamid. Devuelve el mensaje o null si no existe. */
  updateStatusByWaMessageId(
    waMessageId: string,
    status: WhatsappMessageStatus,
  ): Promise<WhatsappMessage | null>;
}
