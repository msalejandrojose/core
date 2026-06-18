import { z } from 'zod';
import { ActionHandlerNotFoundError } from '../../domain/errors/action-handler-not-found.error';
import { ActionHandlerPort } from '../../application/ports/action-handler.port';
import {
  ActionHandlerRegistryPort,
  RegisteredHandlerInfo,
} from '../../application/ports/action-handler-registry.port';

// Registro de handlers de acción. Se construye con la lista de handlers que el
// `WorkflowsModule` provee (built-in + los que registren otros módulos vía
// `forRoot`). Detecta colisiones de `key` al arrancar.
export class NestActionHandlerRegistry implements ActionHandlerRegistryPort {
  private readonly map = new Map<string, ActionHandlerPort>();

  constructor(handlers: ActionHandlerPort[]) {
    for (const handler of handlers) {
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
