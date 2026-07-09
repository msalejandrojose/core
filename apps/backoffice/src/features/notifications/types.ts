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
