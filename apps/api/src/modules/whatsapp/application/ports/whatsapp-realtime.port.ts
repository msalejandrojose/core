import type { WhatsappConversation } from '../../domain/entities/whatsapp-conversation.entity';
import type { WhatsappMessage } from '../../domain/entities/whatsapp-message.entity';

export const WHATSAPP_REALTIME = Symbol('WHATSAPP_REALTIME');

export interface MessageEvent {
  conversation: WhatsappConversation;
  message: WhatsappMessage;
}

export interface StatusEvent {
  conversationId: string;
  message: WhatsappMessage;
}

/**
 * Salida en tiempo real hacia el backoffice. La implementa el gateway de
 * WebSocket; los use cases solo conocen esta interfaz (no socket.io).
 */
export interface WhatsappRealtimePort {
  /** Nuevo mensaje (entrante o saliente) creado en una conversación. */
  broadcastMessage(event: MessageEvent): void;
  /** Cambio de estado de un mensaje saliente (delivered/read/failed…). */
  broadcastStatus(event: StatusEvent): void;
}
