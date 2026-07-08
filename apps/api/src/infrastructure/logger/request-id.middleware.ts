import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { requestContext } from './request-context';

export const REQUEST_ID_HEADER = 'x-request-id';

// Middleware (funcional, montado con `app.use` en main.ts) que asigna un
// correlation id a cada request: respeta un `x-request-id` entrante (útil para
// trazar a través de un gateway/proxy) o genera uno nuevo. Lo devuelve en la
// cabecera de respuesta y abre el AsyncLocalStorage para que el resto del
// pipeline (interceptor de logs, logger, filtro de errores) lo vea.
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.headers[REQUEST_ID_HEADER];
  const requestId =
    (Array.isArray(incoming) ? incoming[0] : incoming)?.trim() || randomUUID();
  res.setHeader(REQUEST_ID_HEADER, requestId);
  requestContext.run({ requestId }, () => next());
}
