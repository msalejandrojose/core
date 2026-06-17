import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
  Optional,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException, normalizeUnknownError } from './app.exception';
import { ERROR_CATALOG } from './error-codes';
import { ErrorLogService } from './error-log/error-log.service';

interface ClientErrorPayload {
  errorId: string;
  code: string;
  message: string;
  level: string;
  timestamp: string;
  path: string;
  statusCode: number;
}

/**
 * Filter global de excepciones.
 *
 * Pipeline:
 *   1. Convierte cualquier excepción (AppException, HttpException, Error) en
 *      una `AppException` (normalización).
 *   2. Loguea el evento de forma estructurada (JSON en stdout) — formato
 *      parseable por Loki / Datadog.
 *   3. Persiste el evento en la tabla `ErrorLog` de forma asíncrona
 *      (fire-and-forget; no bloquea la respuesta) cuando el level es
 *      `warn` o superior.
 *   4. Responde al cliente con el shape unificado `ClientErrorPayload`.
 *
 * El `ErrorLogService` es opcional para evitar acoplamiento duro durante
 * el wiring incremental; si no está disponible, sigue logueando en stdout.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(@Optional() private readonly errorLogService?: ErrorLogService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const appException = this.toAppException(exception);
    const entry = ERROR_CATALOG[appException.code];

    const payload: ClientErrorPayload = {
      errorId: appException.errorId,
      code: appException.code,
      message: appException.message,
      level: appException.level,
      timestamp: new Date().toISOString(),
      path: request?.url ?? '',
      statusCode: entry.httpStatus,
    };

    this.log(appException, request);
    this.persist(appException, request);

    response.status(entry.httpStatus).json(payload);
  }

  private toAppException(exception: unknown): AppException {
    if (exception instanceof AppException) return exception;

    // HttpException de Nest (ValidationPipe, BadRequest, etc.) — preservamos
    // el status pero normalizamos a VALIDATION_FAILED o INTERNAL según el rango.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : (res as { message?: string | string[] }).message
            ? Array.isArray((res as { message: string[] }).message)
              ? (res as { message: string[] }).message.join(', ')
              : ((res as { message: string }).message as string)
            : exception.message;

      if (status >= 400 && status < 500) {
        return new AppException('VALIDATION_FAILED', {
          message,
          cause: exception,
        });
      }
    }

    return normalizeUnknownError(exception);
  }

  private log(err: AppException, req?: Request): void {
    const userId = (req as Request & { user?: { id?: string } })?.user?.id;
    const base = {
      errorId: err.errorId,
      code: err.code,
      level: err.level,
      path: req?.url,
      method: req?.method,
      userId,
      context: err.context,
    };

    switch (err.level) {
      case 'info':
        this.logger.log(JSON.stringify(base));
        break;
      case 'warn':
        this.logger.warn(JSON.stringify(base));
        break;
      case 'error':
        this.logger.error(JSON.stringify({ ...base, stack: err.stack }));
        break;
      case 'critical':
        this.logger.error(JSON.stringify({ ...base, stack: err.stack }));
        break;
    }
  }

  private persist(err: AppException, req?: Request): void {
    if (!this.errorLogService) return;
    // info-level no se persiste — el spec lo descarta para no inflar la tabla.
    if (err.level === 'info') return;

    // Fire-and-forget: no bloqueamos la respuesta al cliente.
    this.errorLogService
      .record(err, req)
      .catch((persistErr) =>
        this.logger.error(
          `Fallo guardando ErrorLog (errorId=${err.errorId}): ${
            persistErr instanceof Error ? persistErr.message : 'unknown'
          }`,
        ),
      );
  }
}
