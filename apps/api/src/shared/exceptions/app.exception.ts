import { HttpException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  ERROR_CATALOG,
  type ErrorCode,
  type ErrorLevel,
} from '../errors/error-catalog';

export interface AppExceptionOptions {
  message?: string;
  context?: Record<string, unknown>;
}

// Excepción genérica de la API. Se construye a partir de un `code` del
// catálogo (`error-catalog.ts`), que determina `httpStatus`, `level` y el
// mensaje por defecto. Pensada para usarse desde `application/` e
// `infrastructure/` (controllers, guards, use cases) — la capa `domain/`
// usa `DomainError` en su lugar para no depender de Nest.
export class AppException extends HttpException {
  readonly errorId: string;
  readonly code: ErrorCode;
  readonly level: ErrorLevel;
  readonly context?: Record<string, unknown>;

  constructor(code: ErrorCode, options?: AppExceptionOptions) {
    const entry = ERROR_CATALOG[code];
    super(options?.message ?? entry.defaultMessage, entry.httpStatus);
    this.errorId = randomUUID();
    this.code = code;
    this.level = entry.level;
    this.context = options?.context;
  }
}
