import type { NotificationChannel } from '@core/shared-types';
import type { ChannelDispatcherPort } from './channel-dispatcher.port';

export const CHANNEL_DISPATCHER_REGISTRY = Symbol(
  'NOTIFICATIONS_CHANNEL_DISPATCHER_REGISTRY',
);

export interface ChannelDispatcherRegistryPort {
  /** Devuelve el dispatcher del canal, o null si no hay ninguno registrado. */
  get(channel: NotificationChannel): ChannelDispatcherPort | null;
}
