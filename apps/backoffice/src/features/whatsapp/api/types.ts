export type WhatsappDirection = 'INBOUND' | 'OUTBOUND';

export interface WhatsappAccount {
  id: string;
  name: string;
  phoneNumberId: string | null;
}

export interface WhatsappConversation {
  id: string;
  accountId: string;
  contactPhone: string;
  contactName: string | null;
  lastMessagePreview: string | null;
  lastDirection: WhatsappDirection;
  unreadCount: number;
  lastMessageAt: string;
}

export interface WhatsappMessage {
  id: string;
  conversationId: string;
  direction: WhatsappDirection;
  body: string;
  status: string;
  timestamp: string;
}

// Eventos que emite el gateway de WebSocket (namespace /whatsapp).
export interface WhatsappMessageEvent {
  conversation: WhatsappConversation;
  message: WhatsappMessage;
}

export interface WhatsappStatusEvent {
  conversationId: string;
  message: WhatsappMessage;
}
