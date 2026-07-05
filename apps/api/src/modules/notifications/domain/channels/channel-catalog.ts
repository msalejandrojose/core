import type { NotificationChannel } from '@core/shared-types';
import type { FieldDescriptor } from './field-descriptor';

// Catálogo de canales: fuente de verdad EN CÓDIGO de qué campos necesita cada
// canal, tanto para configurar una cuenta (`config`) como para el contenido de
// un tipo de mensaje (`message`). El `SendingAccountType` guarda una copia de
// estos descriptores en BBDD (para que el backoffice sepa qué pintar sin
// consultar código), pero la validación server-side SIEMPRE usa este catálogo.
//
// Añadir un canal = añadir una entrada aquí + un dispatcher + (opcional) seed
// del `SendingAccountType`. Nada más del sistema hay que tocar.
export interface ChannelDefinition {
  config: FieldDescriptor[];
  message: FieldDescriptor[];
}

export const CHANNEL_CATALOG: Record<NotificationChannel, ChannelDefinition> = {
  EMAIL: {
    config: [
      {
        key: 'provider',
        label: 'Proveedor',
        type: 'select',
        options: ['resend'],
        required: true,
      },
      {
        key: 'fromEmail',
        label: 'Email remitente',
        type: 'email',
        required: true,
      },
      { key: 'fromName', label: 'Nombre remitente', type: 'text' },
      {
        key: 'apiKey',
        label: 'API key',
        type: 'text',
        secret: true,
        help: 'Clave del proveedor (Resend). Se guarda cifrada. Si se omite, se usa el mailer global (env).',
      },
    ],
    message: [
      { key: 'subject', label: 'Asunto', type: 'text', required: true },
      { key: 'html', label: 'Cuerpo HTML', type: 'textarea', required: true },
      { key: 'text', label: 'Cuerpo texto plano', type: 'textarea' },
    ],
  },
  SMS: {
    config: [
      {
        key: 'provider',
        label: 'Proveedor',
        type: 'select',
        options: ['twilio'],
        required: true,
      },
      {
        key: 'accountSid',
        label: 'Account SID',
        type: 'text',
        required: true,
        secret: true,
      },
      {
        key: 'authToken',
        label: 'Auth token',
        type: 'text',
        required: true,
        secret: true,
      },
      {
        key: 'fromNumber',
        label: 'Número remitente',
        type: 'text',
        required: true,
      },
    ],
    message: [
      { key: 'body', label: 'Texto del SMS', type: 'textarea', required: true },
    ],
  },
  PUSH: {
    config: [
      {
        key: 'provider',
        label: 'Proveedor',
        type: 'select',
        options: ['fcm'],
        required: true,
      },
      {
        key: 'serverKey',
        label: 'Server key',
        type: 'text',
        required: true,
        secret: true,
      },
    ],
    message: [
      { key: 'title', label: 'Título', type: 'text', required: true },
      { key: 'body', label: 'Cuerpo', type: 'textarea', required: true },
      { key: 'deepLink', label: 'Deep link', type: 'text' },
    ],
  },
};

export function channelDefinition(
  channel: NotificationChannel,
): ChannelDefinition {
  return CHANNEL_CATALOG[channel];
}

/** Keys de los campos marcados como secretos (para cifrar/enmascarar). */
export function secretFieldKeys(fields: FieldDescriptor[]): string[] {
  return fields.filter((f) => f.secret).map((f) => f.key);
}
