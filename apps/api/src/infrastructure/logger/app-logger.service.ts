import { Injectable, type LoggerService } from '@nestjs/common';
import pino from 'pino';
import { getRequestId } from './request-context';

// Instancia pino de la app: una línea JSON por stdout (formato estructurado,
// parseable por Loki/Datadog y visible con `docker compose logs api`). El nivel
// se controla con `LOG_LEVEL` (default `info`).
const logger = pino({
  name: 'api',
  level: process.env.LOG_LEVEL ?? 'info',
});

/**
 * Logger global de la app. Se inyecta con `app.useLogger()` en el bootstrap, de
 * modo que TODOS los logs de Nest (incluidos los del framework) salen como JSON
 * estructurado y, dentro de una request, llevan el `requestId` de correlación.
 */
@Injectable()
export class AppLoggerService implements LoggerService {
  private fields(context?: string): Record<string, unknown> {
    return { requestId: getRequestId(), context };
  }

  log(message: unknown, context?: string): void {
    logger.info(this.fields(context), String(message));
  }

  error(message: unknown, stack?: string, context?: string): void {
    logger.error({ ...this.fields(context), stack }, String(message));
  }

  warn(message: unknown, context?: string): void {
    logger.warn(this.fields(context), String(message));
  }

  debug(message: unknown, context?: string): void {
    logger.debug(this.fields(context), String(message));
  }

  verbose(message: unknown, context?: string): void {
    logger.trace(this.fields(context), String(message));
  }

  /** Log estructurado de una request HTTP completada (lo usa el interceptor). */
  http(payload: {
    method: string;
    url: string;
    statusCode: number;
    durationMs: number;
  }): void {
    logger.info(
      { ...this.fields('HTTP'), ...payload },
      `${payload.method} ${payload.url} ${payload.statusCode} ${payload.durationMs}ms`,
    );
  }
}
