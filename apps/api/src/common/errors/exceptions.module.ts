import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './global-exception.filter';
import { ErrorLogService } from './error-log/error-log.service';

/**
 * Módulo global que cablea el sistema de excepciones de la API.
 *
 * - Registra `GlobalExceptionFilter` como `APP_FILTER` (filter global).
 * - Provee `ErrorLogService` para persistir en BD.
 *
 * El cliente Prisma para `ErrorLogService` se inyecta por separado
 * vía el token `ERROR_LOG_PRISMA_CLIENT` desde el módulo que conoce
 * el `PrismaClient` concreto. Si no se provee, el servicio funciona
 * en modo "log-only".
 */
@Global()
@Module({
  providers: [
    ErrorLogService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [ErrorLogService],
})
export class ExceptionsModule {}
