import type {
  WhatsappConversation,
  WhatsappMessageDirection,
} from '../../domain/entities/whatsapp-conversation.entity';

export const WHATSAPP_CONVERSATION_REPOSITORY = Symbol(
  'WHATSAPP_CONVERSATION_REPOSITORY',
);

export interface CreateConversationData {
  accountId: string;
  contactPhone: string;
  contactName: string | null;
}

export interface TouchConversationData {
  lastMessageAt: Date;
  lastMessagePreview: string;
  lastDirection: WhatsappMessageDirection;
  /** Suma 1 al contador de no leídos (solo entrantes). */
  incrementUnread: boolean;
  /** Actualiza el nombre del contacto si Meta lo trae y no lo teníamos. */
  contactName?: string | null;
}

export interface ListConversationsOptions {
  accountId?: string;
  limit: number;
}

export interface WhatsappConversationRepositoryPort {
  findById(id: string): Promise<WhatsappConversation | null>;
  findByAccountAndContact(
    accountId: string,
    contactPhone: string,
  ): Promise<WhatsappConversation | null>;
  create(data: CreateConversationData): Promise<WhatsappConversation>;
  list(opts: ListConversationsOptions): Promise<WhatsappConversation[]>;
  touch(id: string, data: TouchConversationData): Promise<WhatsappConversation>;
  resetUnread(id: string): Promise<WhatsappConversation>;
}
