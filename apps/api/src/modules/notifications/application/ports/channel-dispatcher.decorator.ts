import 'reflect-metadata';

/**
 * Marca una clase como `ChannelDispatcherPort` para que el registry la
 * descubra vía `DiscoveryService`. Añadir un canal nuevo = crear un dispatcher
 * decorado con `@ChannelDispatcher()` y registrarlo como provider; el registry
 * lo recoge por su propiedad `channel` sin más cableado.
 */
export const CHANNEL_DISPATCHER_META = 'notifications:channel-dispatcher';

export function ChannelDispatcher(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(CHANNEL_DISPATCHER_META, true, target);
  };
}
