import 'reflect-metadata';

/**
 * Marca una clase como `ActionHandlerPort` para que el registry la descubra
 * (vía `DiscoveryService`) sin que `workflows` tenga que importar el módulo que
 * la define. Así cualquier feature module puede aportar sus propios handlers
 * declarándolos como providers y decorándolos con `@WorkflowActionHandler()`.
 */
export const WORKFLOW_ACTION_HANDLER_META = 'workflows:action-handler';

export function WorkflowActionHandler(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(WORKFLOW_ACTION_HANDLER_META, true, target);
  };
}
