import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import type { NotificationChannel } from '@core/shared-types';
import type { ChannelDispatcherPort } from '../../application/ports/channel-dispatcher.port';
import type { ChannelDispatcherRegistryPort } from '../../application/ports/channel-dispatcher-registry.port';
import { CHANNEL_DISPATCHER_META } from '../../application/ports/channel-dispatcher.decorator';

// Registro de dispatchers de canal. Se puebla en `onApplicationBootstrap`
// descubriendo cualquier provider decorado con `@ChannelDispatcher()` y lo
// indexa por su propiedad `channel`. Detecta colisiones.
@Injectable()
export class NestChannelDispatcherRegistry
  implements ChannelDispatcherRegistryPort, OnApplicationBootstrap
{
  private readonly map = new Map<NotificationChannel, ChannelDispatcherPort>();

  constructor(private readonly discovery: DiscoveryService) {}

  onApplicationBootstrap(): void {
    for (const wrapper of this.discovery.getProviders()) {
      const instance: unknown = wrapper.instance;
      const metatype = wrapper.metatype;
      if (!instance || !metatype) continue;
      if (!Reflect.getMetadata(CHANNEL_DISPATCHER_META, metatype)) continue;

      const dispatcher = instance as ChannelDispatcherPort;
      if (this.map.has(dispatcher.channel)) {
        throw new Error(`Duplicate channel dispatcher: ${dispatcher.channel}`);
      }
      this.map.set(dispatcher.channel, dispatcher);
    }
  }

  get(channel: NotificationChannel): ChannelDispatcherPort | null {
    return this.map.get(channel) ?? null;
  }
}
