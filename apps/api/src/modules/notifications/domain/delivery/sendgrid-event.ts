import type { DeliveryStatus } from '../entities/notification-delivery.entity';

// Forma (parcial) de un evento del Event Webhook de SendGrid. Los custom_args
// que enviamos en el `send` (aquí `deliveryId`) se devuelven como claves de
// primer nivel en cada evento, por eso `deliveryId` aparece aquí.
export interface SendgridEvent {
  email?: string;
  /** Unix epoch en segundos. */
  timestamp?: number;
  event?: string;
  sg_message_id?: string;
  reason?: string;
  /** custom_arg que fijamos al enviar, para correlacionar con la delivery. */
  deliveryId?: string;
  [key: string]: unknown;
}

// Mapea el tipo de evento de SendGrid a nuestro estado. Los tipos que no
// afectan al estado (p. ej. `group_resubscribe`) devuelven null y se ignoran.
const EVENT_STATUS: Record<string, DeliveryStatus> = {
  processed: 'sent',
  delivered: 'delivered',
  deferred: 'deferred',
  bounce: 'bounced',
  blocked: 'bounced',
  dropped: 'dropped',
  open: 'opened',
  click: 'clicked',
  spamreport: 'spam',
  unsubscribe: 'unsubscribed',
  group_unsubscribe: 'unsubscribed',
};

export function sendgridEventToStatus(
  event: string | undefined,
): DeliveryStatus | null {
  if (!event) return null;
  return EVENT_STATUS[event] ?? null;
}

/**
 * `sg_message_id` tiene la forma `<x-message-id>.<filtros>`; su prefijo coincide
 * con el `x-message-id` que capturamos en la respuesta del envío. Devuelve ese
 * prefijo para correlacionar cuando no hay `deliveryId`.
 */
export function providerMessageIdFromEvent(e: SendgridEvent): string | null {
  if (typeof e.sg_message_id !== 'string' || e.sg_message_id === '') {
    return null;
  }
  return e.sg_message_id.split('.')[0];
}
