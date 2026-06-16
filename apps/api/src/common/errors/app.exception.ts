import { HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  ERROR_CATALOG,
  ErrorCatalogEntry,
  ErrorCode,
  ErrorLevel,
} from './error-codes';

/**
 * Excepción aplicativa base.
 *
 * Toda excepción "esperada" del backend debe extender `AppException` o
 * usarla directamente. El `code` se resuelve contra el `ERROR_CATALOG`,
 * de donde se derivan `httpStatus`, `level` y el `message` por defecto.
 *
 * Cada instancia genera un `errorId` (UUIDv4) para correlacionar la
 * respuesta al cliente, el log en stdout y la fila en `ErrorLog`.
 *
 * Uso típico:
 * ```ts
 * throw new AppException('USER_NOT_FOUND');
 * throw new AppException('USER_EMAIL_ALREADY_EXISTS', { context: { email } });
 * throw new AppException('VALIDATION_FAILED', { message: 'El campo X no es válido' });
 * ```
 */
export class AppException extends HttpException {
  readonly errorId: string;
  readonly code: ErrorCode;
  readonly level: ErrorLevel;
  readonly context?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    options: {
      message?: string;
      context?: Record<string, unknown>;
      cause?: unknown;
    } = {},
  ) {
    const entry: ErrorCatalogEntry = ERROR_CATALOG[code];
    const message = options.message ?? entry.defaultMessage;

    super(
      {
        code,
        message,
        level: entry.level,
      },
      entry.httpStatus,
      { cause: options.cause },
    );

    this.errorId = randomUUID();
    this.code = code;
    this.level = entry.level;
    this.context = options.context;
  }
}

/**
 * Normaliza cualquier error no controlado en una `AppException`
 * con `INTERNAL_UNEXPECTED`. Usado por el filter global para que
 * incluso los 5xx pasen por el mismo pipeline.
 */
export function normalizeUnknownError(err: unknown): AppException {
  if (err instanceof AppException) return err;

  const message = err instanceof Error ? err.message : 'Unknown error';
  return new AppException('INTERNAL_UNEXPECTED', {
    message,
    cause: err,
    context: err instanceof Error ? { name: err.name } : undefined,
  });
}

/** Re-exportamos `HttpStatus` por conveniencia para los consumidores. */
export { HttpStatus };
