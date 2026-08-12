import type { NotificationChannel } from '@core/shared-types';
import { NOTIFICATION_CHANNELS } from '@core/shared-types';

export type { NotificationChannel };
export { NOTIFICATION_CHANNELS };

// Marcador que la API devuelve en lugar de un secreto (ver `config-secrets.ts`
// en el backend). Reenviarlo (o vacío) en un update ⇒ "conservar el actual".
export const MASK = '••••••••';

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  EMAIL: 'Email',
  SMS: 'SMS',
  WHATSAPP: 'WhatsApp',
  PUSH: 'Push',
};

// Descriptor declarativo de un campo (espejo de `field-descriptor.ts` del
// backend). Dirige el render del formulario dinámico: qué input pintar por
// canal, sin conocer el canal a priori.
export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'number'
  | 'select'
  | 'boolean'
  | 'template';

export interface FieldDescriptor {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  /** Secreto (apiKey, token…): enmascarado en lectura, "reemplazar" en edición. */
  secret?: boolean;
  options?: string[];
  help?: string;
}

export interface SendingAccountType {
  id: string;
  key: string;
  name: string;
  channel: NotificationChannel;
  configSchema: FieldDescriptor[];
  messageSchema: FieldDescriptor[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SendingAccount {
  id: string;
  typeId: string;
  channel?: NotificationChannel;
  name: string;
  config: Record<string, unknown>;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageTypeAccountRef {
  id: string;
  name: string;
  channel: NotificationChannel;
}

export interface MessageType {
  id: string;
  key: string;
  name: string;
  accountId: string;
  account?: MessageTypeAccountRef;
  content: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Bandeja de deliveries (log de entregabilidad) ------------------------

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

export const DELIVERY_STATUSES: DeliveryStatus[] = [
  'pending',
  'sent',
  'deferred',
  'delivered',
  'opened',
  'clicked',
  'unsubscribed',
  'spam',
  'dropped',
  'bounced',
  'failed',
];

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pendiente',
  sent: 'Enviado',
  deferred: 'Diferido',
  delivered: 'Entregado',
  opened: 'Abierto',
  clicked: 'Clic',
  unsubscribed: 'Baja',
  spam: 'Spam',
  dropped: 'Descartado',
  bounced: 'Rebotado',
  failed: 'Fallido',
};

export interface DeliveryEvent {
  type: string;
  at: string;
  reason?: string;
}

export interface Delivery {
  id: string;
  messageTypeId: string | null;
  messageTypeKey: string;
  accountId: string | null;
  channel: NotificationChannel;
  provider: string;
  to: string;
  subject: string | null;
  status: DeliveryStatus;
  providerMessageId: string | null;
  error: string | null;
  events: DeliveryEvent[];
  sentAt: string | null;
  deliveredAt: string | null;
  lastEventAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Centro de webhooks (eventos entrantes) --------------------------------

export type WebhookEventStatus = 'pending' | 'processed' | 'failed';

export const WEBHOOK_EVENT_STATUSES: WebhookEventStatus[] = [
  'pending',
  'processed',
  'failed',
];

export const WEBHOOK_EVENT_STATUS_LABELS: Record<WebhookEventStatus, string> = {
  pending: 'Pendiente',
  processed: 'Procesado',
  failed: 'Fallido',
};

export interface WebhookEvent {
  id: string;
  source: string;
  type: string | null;
  payload: unknown;
  signatureValid: boolean;
  status: WebhookEventStatus;
  result: string | null;
  error: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
