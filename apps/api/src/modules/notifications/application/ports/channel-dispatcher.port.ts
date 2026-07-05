import type { NotificationChannel } from '@core/shared-types';

// Cuenta ya resuelta para el envío: canal + config con los secretos DESCIFRADOS.
export interface DispatchAccount {
  id: string;
  name: string;
  channel: NotificationChannel;
  config: Record<string, unknown>;
}

// Mensaje ya renderizado (placeholders resueltos) y validado.
export interface RenderedMessage {
  to: string;
  content: Record<string, unknown>;
}

// Un dispatcher entrega mensajes por un canal concreto. Se registra por canal;
// el registry (`ChannelDispatcherRegistryPort`) resuelve el adecuado.
export interface ChannelDispatcherPort {
  readonly channel: NotificationChannel;
  dispatch(account: DispatchAccount, message: RenderedMessage): Promise<void>;
}
