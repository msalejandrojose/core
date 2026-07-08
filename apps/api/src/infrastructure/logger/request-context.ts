import { AsyncLocalStorage } from 'node:async_hooks';

// Contexto por-request propagado vía AsyncLocalStorage. Lo puebla
// `requestIdMiddleware` al principio de cada request y lo leen el logger y el
// filtro de excepciones para correlacionar todas las líneas de una misma
// petición por su `requestId`. Sin dependencias externas (cls-rtracer, etc.).
export interface RequestStore {
  requestId: string;
}

export const requestContext = new AsyncLocalStorage<RequestStore>();

/** `requestId` de la petición en curso, o `undefined` fuera de una request. */
export function getRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}
