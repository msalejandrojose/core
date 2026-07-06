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

// Contexto opcional del envío. `deliveryId` permite al proveedor devolvernos la
// referencia en sus webhooks (SendGrid la fija como custom_arg) y así
// correlacionar los eventos de entrega con la delivery persistida.
export interface DispatchOptions {
  deliveryId?: string;
}

// Resultado del envío. `providerMessageId` es el id que devuelve el proveedor
// (SendGrid: x-message-id; Resend: id) para correlacionar con el webhook.
export interface DispatchResult {
  providerMessageId?: string;
}

// Un dispatcher entrega mensajes por un canal concreto. Se registra por canal;
// el registry (`ChannelDispatcherRegistryPort`) resuelve el adecuado.
export interface ChannelDispatcherPort {
  readonly channel: NotificationChannel;
  dispatch(
    account: DispatchAccount,
    message: RenderedMessage,
    options?: DispatchOptions,
  ): Promise<DispatchResult>;
}
