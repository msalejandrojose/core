import { z } from 'zod';

// Canal físico por el que una `SendingAccount` entrega un mensaje. El valor lo
// aporta el `SendingAccountType`; todo el resto del sistema lo deriva de ahí
// (una `MessageType` selecciona una cuenta ⇒ hereda su canal). Añadir un canal
// nuevo aquí + un dispatcher + una entrada en el catálogo de canales.
export const NotificationChannelSchema = z.enum([
  'EMAIL',
  'SMS',
  'PUSH',
  'WHATSAPP',
  // futuro: 'WEBHOOK', 'IN_APP'…
]);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
export const NOTIFICATION_CHANNELS = NotificationChannelSchema.options;
