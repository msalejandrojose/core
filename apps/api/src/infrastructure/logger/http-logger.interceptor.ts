import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { type Observable, tap } from 'rxjs';
import { AppLoggerService } from './app-logger.service';

// Interceptor global que emite una línea de log estructurada por cada request
// HTTP completada (método, url, status, duración) con el `requestId` de
// correlación. Registrado vía APP_INTERCEPTOR en `LoggerModule`.
@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const startedAt = Date.now();
    const { method, originalUrl, url } = req;
    const path = originalUrl || url;

    const write = (statusCode: number) =>
      this.logger.http({
        method,
        url: path,
        statusCode,
        durationMs: Date.now() - startedAt,
      });

    return next.handle().pipe(
      tap({
        next: () => write(res.statusCode),
        // En error, el status real lo pone el filtro de excepciones después;
        // usamos el de la respuesta si ya está, o 500 como aproximación.
        error: () => write(res.statusCode >= 400 ? res.statusCode : 500),
      }),
    );
  }
}
