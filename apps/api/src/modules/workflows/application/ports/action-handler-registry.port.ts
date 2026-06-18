import { ActionHandlerPort } from './action-handler.port';

export const ACTION_HANDLER_REGISTRY = Symbol(
  'workflows.ActionHandlerRegistry',
);

export interface RegisteredHandlerInfo {
  key: string;
  inputSchema: unknown; // JSON schema aproximado, para el editor del backoffice
}

export interface ActionHandlerRegistryPort {
  resolve(key: string): ActionHandlerPort;
  has(key: string): boolean;
  list(): RegisteredHandlerInfo[];
}
