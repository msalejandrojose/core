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
        options: ['resend', 'sendgrid'],
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
        help: 'Clave del proveedor (Resend o SendGrid). Se guarda cifrada. Si se omite, se usa el mailer global (env).',
      },
    ],
    // `html` NO es requerido: el cuerpo puede venir como HTML directo o como
    // `template` de bloques (que se compila a HTML en el envío). La regla
    // "html o template" la aplica `validateMessageContent`.
    message: [
      { key: 'subject', label: 'Asunto', type: 'text', required: true },
      { key: 'html', label: 'Cuerpo HTML', type: 'textarea' },
      { key: 'text', label: 'Cuerpo texto plano', type: 'textarea' },
      {
        key: 'template',
        label: 'Plantilla por bloques',
        type: 'template',
        help: 'Composición por bloques (hero, texto, botón…). Si se define, el motor la compila a HTML en el envío.',
      },
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
  WHATSAPP: {
    config: [
      {
        key: 'provider',
        label: 'Proveedor',
        type: 'select',
        options: ['meta'],
        required: true,
      },
      {
        key: 'phoneNumberId',
        label: 'Phone Number ID',
        type: 'text',
        required: true,
        help: 'ID del número de WhatsApp en Meta (Cloud API).',
      },
      {
        key: 'accessToken',
        label: 'Access token',
        type: 'text',
        required: true,
        secret: true,
        help: 'Token permanente de la app de Meta. Se guarda cifrado.',
      },
      {
        key: 'apiVersion',
        label: 'Versión de la API',
        type: 'text',
        help: 'Versión del Graph API (por defecto v21.0).',
      },
    ],
    message: [
      {
        key: 'body',
        label: 'Texto del mensaje',
        type: 'textarea',
        required: true,
      },
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
