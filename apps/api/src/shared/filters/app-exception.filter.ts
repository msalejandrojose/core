import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { ErrorLogService } from '../../infrastructure/error-log/error-log.service';
import { logStructuredError } from '../../infrastructure/logger/structured-logger';
import { AppException } from '../exceptions/app.exception';
import { DomainError } from '../errors/domain-error';
import {
  ERROR_CATALOG,
  getErrorCatalogEntry,
  type ErrorCode,
  type ErrorLevel,
} from '../errors/error-catalog';

interface ResolvedError {
  code: string;
  httpStatus: number;
  level: ErrorLevel;
  message: string;
  errorId: string;
  context?: Record<string, unknown>;
}

// Fallback genérico para `HttpException` "de fábrica" de Nest (ValidationPipe,
// guards, etc.) que no son `AppException` ni `DomainError`. Solo decide el
// `code`/`level` a partir del status — el mensaje real lo da la excepción.
const HTTP_STATUS_FALLBACK_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
  [HttpStatus.UNAUTHORIZED]: 'INVALID_CREDENTIALS',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
};

// Filtro global: captura `AppException`, `DomainError`, cualquier otra
// `HttpException` (p.ej. las que lanza `ValidationPipe`) y errores
// desconocidos. Responde al cliente con un JSON estandarizado, loggea en
// stdout (JSON estructurado, visible con `docker compose logs api`) y
// dispara la persistencia en `ErrorLog` de forma asíncrona (no bloqueante).
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  constructor(private readonly errorLog: ErrorLogService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const resolved = this.resolve(exception);
    const timestamp = new Date().toISOString();

    response.status(resolved.httpStatus).json({
      errorId: resolved.errorId,
      code: resolved.code,
      message: resolved.message,
      level: resolved.level,
      timestamp,
      path: request.url,
    });

    const userId = (request as Request & { user?: { id?: string } }).user?.id;
    const stack =
      resolved.level === 'error' || resolved.level === 'critical'
        ? exception instanceof Error
          ? exception.stack
          : undefined
        : undefined;

    logStructuredError(
      {
        errorId: resolved.errorId,
        code: resolved.code,
        level: resolved.level,
        httpStatus: resolved.httpStatus,
        path: request.url,
        method: request.method,
        userId,
        stack,
      },
      resolved.message,
    );

    // No bloquea la respuesta: se dispara y se ignora (el propio service
    // ya loggea si falla). `info` no se persiste para no inflar la tabla.
    if (resolved.level !== 'info') {
      void this.errorLog.record({
        errorId: resolved.errorId,
        code: resolved.code,
        level: resolved.level,
        httpStatus: resolved.httpStatus,
        message: resolved.message,
        path: request.url,
        method: request.method,
        userId,
        context: resolved.context,
        stack,
      });
    }
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof AppException) {
      return {
        code: exception.code,
        httpStatus: exception.getStatus(),
        level: exception.level,
        message: exception.message,
        errorId: exception.errorId,
        context: exception.context,
      };
    }

    if (exception instanceof DomainError) {
      const entry = getErrorCatalogEntry(exception.code);
      return {
        code: exception.code,
        httpStatus: entry.httpStatus,
        level: entry.level,
        message: exception.message,
        errorId: randomUUID(),
        context: exception.context,
      };
    }

    if (exception instanceof HttpException) {
      const httpStatus = exception.getStatus();
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] })?.message ??
            exception.message);
      const code = HTTP_STATUS_FALLBACK_CODE[httpStatus];
      const entry = code ? ERROR_CATALOG[code] : undefined;
      return {
        code: code ?? `HTTP_${httpStatus}`,
        httpStatus,
        level: entry?.level ?? (httpStatus >= 500 ? 'error' : 'warn'),
        message: Array.isArray(message) ? message.join(' ') : message,
        errorId: randomUUID(),
      };
    }

    // Error desconocido / no controlado.
    return {
      code: 'INTERNAL_UNEXPECTED',
      httpStatus: ERROR_CATALOG.INTERNAL_UNEXPECTED.httpStatus,
      level: ERROR_CATALOG.INTERNAL_UNEXPECTED.level,
      message: ERROR_CATALOG.INTERNAL_UNEXPECTED.defaultMessage,
      errorId: randomUUID(),
    };
  }
}
