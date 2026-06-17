// Catálogo + tipos
export {
  ERROR_CODES,
  ERROR_CATALOG,
  getErrorCatalogEntry,
} from './error-codes';
export type { ErrorCode, ErrorLevel, ErrorCatalogEntry } from './error-codes';

// Excepción base
export { AppException, normalizeUnknownError } from './app.exception';

// Filter global
export { GlobalExceptionFilter } from './global-exception.filter';

// Servicio de persistencia
export {
  ErrorLogService,
  ERROR_LOG_PRISMA_CLIENT,
} from './error-log/error-log.service';
export type { ErrorLogPrismaLike } from './error-log/error-log.service';

// Módulo
export { ExceptionsModule } from './exceptions.module';
