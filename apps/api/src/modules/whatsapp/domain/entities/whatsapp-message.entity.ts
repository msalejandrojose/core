import type { WhatsappMessageDirection } from './whatsapp-conversation.entity';

export type WhatsappMessageStatus =
  | 'received'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export interface WhatsappMessage {
  id: string;
  conversationId: string;
  direction: WhatsappMessageDirection;
  /** `wamid` de Meta. Null para salientes en stub (sin credenciales). */
  waMessageId: string | null;
  body: string;
  status: WhatsappMessageStatus;
  timestamp: Date;
  createdAt: Date;
}
