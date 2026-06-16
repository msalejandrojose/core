import pino from 'pino';
import type { ErrorLevel } from '../../shared/errors/error-catalog';

// Logger dedicado a errores: emite una línea JSON por stdout, parseable por
// agregadores de logs (Loki, Datadog...) y visible con `docker compose logs api`.
// No sustituye al `Logger` de Nest para el resto de la app (eso es una
// decisión separada, fuera del alcance de esta ticket) — solo cubre el
// requisito de "logs estructurados" para el sistema de excepciones.
export const errorStructuredLogger = pino({
  name: 'api',
  level: process.env.LOG_LEVEL ?? 'info',
});

const LEVEL_TO_PINO: Record<ErrorLevel, 'info' | 'warn' | 'error' | 'fatal'> = {
  info: 'info',
  warn: 'warn',
  error: 'error',
  critical: 'fatal',
};

export interface StructuredErrorLogPayload {
  errorId: string;
  code: string;
  level: ErrorLevel;
  httpStatus: number;
  path?: string;
  method?: string;
  userId?: string;
  stack?: string;
}

export function logStructuredError(
  payload: StructuredErrorLogPayload,
  message: string,
): void {
  const pinoLevel = LEVEL_TO_PINO[payload.level];
  errorStructuredLogger[pinoLevel](payload, message);
}
