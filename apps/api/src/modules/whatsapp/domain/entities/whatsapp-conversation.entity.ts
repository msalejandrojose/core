export type WhatsappMessageDirection = 'INBOUND' | 'OUTBOUND';

export interface WhatsappConversation {
  id: string;
  accountId: string;
  contactPhone: string;
  contactName: string | null;
  lastMessageAt: Date;
  lastMessagePreview: string | null;
  lastDirection: WhatsappMessageDirection;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}
