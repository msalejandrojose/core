import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppLoggerService } from './app-logger.service';
import { HttpLoggerInterceptor } from './http-logger.interceptor';

// Módulo global de logging. Provee el `AppLoggerService` (usado como logger de
// Nest vía `app.useLogger` en el bootstrap y exportado para inyección) y
// registra el interceptor de acceso HTTP. El correlation id lo aporta
// `requestIdMiddleware`, montado con `app.use` en main.ts.
@Global()
@Module({
  providers: [
    AppLoggerService,
    { provide: APP_INTERCEPTOR, useClass: HttpLoggerInterceptor },
  ],
  exports: [AppLoggerService],
})
export class LoggerModule {}
