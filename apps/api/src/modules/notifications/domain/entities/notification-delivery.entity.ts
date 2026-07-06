import type { NotificationChannel } from '@core/shared-types';

// Estados de un envío. Progresan por engagement; los negativos (bounce/dropped/
// spam/failed) son terminales y "ganan" sobre los positivos. El orden de los
// webhooks no está garantizado, por eso el estado se resuelve por ranking
// (ver domain/delivery/delivery-status.ts), no por "el último que llega".
export type DeliveryStatus =
  | 'pending'
  | 'sent'
  | 'deferred'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'unsubscribed'
  | 'spam'
  | 'dropped'
  | 'bounced'
  | 'failed';

/** Un evento del histórico de un envío (normalmente venido de un webhook). */
export interface DeliveryEvent {
  /** Tipo original del proveedor (delivered, bounce, open…). */
  type: string;
  /** ISO-8601. */
  at: string;
  /** Motivo/detalle (p. ej. razón del bounce). */
  reason?: string;
}

export interface NotificationDelivery {
  id: string;
  messageTypeId: string | null;
  messageTypeKey: string;
  accountId: string | null;
  channel: NotificationChannel;
  provider: string;
  toAddress: string;
  subject: string | null;
  status: DeliveryStatus;
  /** Id del proveedor para correlacionar los eventos del webhook. */
  providerMessageId: string | null;
  error: string | null;
  events: DeliveryEvent[];
  sentAt: Date | null;
  deliveredAt: Date | null;
  lastEventAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
