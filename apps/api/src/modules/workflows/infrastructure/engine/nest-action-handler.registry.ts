import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { z } from 'zod';
import { ActionHandlerNotFoundError } from '../../domain/errors/action-handler-not-found.error';
import { ActionHandlerPort } from '../../application/ports/action-handler.port';
import {
  ActionHandlerRegistryPort,
  RegisteredHandlerInfo,
} from '../../application/ports/action-handler-registry.port';
import { WORKFLOW_ACTION_HANDLER_META } from '../../application/ports/workflow-action-handler.decorator';

// Registro de handlers de acción. Se puebla en `onApplicationBootstrap` (cuando
// todos los providers de la app ya están instanciados) descubriendo, vía
// `DiscoveryService`, cualquier provider decorado con `@WorkflowActionHandler()`
// —sea de `workflows` o de otro módulo—. Detecta colisiones de `key`.
@Injectable()
export class NestActionHandlerRegistry
  implements ActionHandlerRegistryPort, OnApplicationBootstrap
{
  private readonly map = new Map<string, ActionHandlerPort>();

  constructor(private readonly discovery: DiscoveryService) {}

  onApplicationBootstrap(): void {
    for (const wrapper of this.discovery.getProviders()) {
      const instance: unknown = wrapper.instance;
      const metatype = wrapper.metatype;
      if (!instance || !metatype) continue;
      if (!Reflect.getMetadata(WORKFLOW_ACTION_HANDLER_META, metatype))
        continue;

      const handler = instance as ActionHandlerPort;
      if (this.map.has(handler.key)) {
        throw new Error(`Duplicate action handler key: ${handler.key}`);
      }
      this.map.set(handler.key, handler);
    }
  }

  resolve(key: string): ActionHandlerPort {
    const handler = this.map.get(key);
    if (!handler) throw new ActionHandlerNotFoundError(key);
    return handler;
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  list(): RegisteredHandlerInfo[] {
    return [...this.map.values()].map((handler) => ({
      key: handler.key,
      inputSchema: this.toJsonSchema(handler),
    }));
  }

  private toJsonSchema(handler: ActionHandlerPort): unknown {
    try {
      return z.toJSONSchema(handler.inputSchema);
    } catch {
      return {};
    }
  }
}
