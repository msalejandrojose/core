import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import type { Application, NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { AppLoggerService } from './infrastructure/logger/app-logger.service';
import { requestIdMiddleware } from './infrastructure/logger/request-id.middleware';

async function bootstrap() {
  // `rawBody: true` expone `req.rawBody` (Buffer del cuerpo sin parsear), que el
  // webhook de SendGrid necesita para verificar la firma sobre los bytes exactos.
  // `bufferLogs: true` retiene los logs de arranque hasta que el logger global
  // (`AppLoggerService`) esté listo, para que también salgan como JSON.
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });

  // Logger estructurado global (Pino, JSON con request-id). Reemplaza al logger
  // por defecto de Nest para toda la app.
  app.useLogger(app.get(AppLoggerService));

  // Detrás de un proxy (Caddy en local, LB en cloud): confía en la cabecera
  // para que `req.ip` sea la IP real del cliente (la usa el rate limiter).
  const expressApp = app.getHttpAdapter().getInstance() as Application;
  expressApp.set('trust proxy', 1);

  // Security headers. `contentSecurityPolicy` desactivada para no romper la UI
  // de Swagger en `/docs` (la API es API-first: sirve JSON, no HTML de negocio).
  app.use(helmet({ contentSecurityPolicy: false }));

  // Correlation id por request (x-request-id) antes de cualquier ruta, para que
  // logs, interceptor y filtro de errores compartan el id.
  app.use((req: Request, res: Response, next: NextFunction) =>
    requestIdMiddleware(req, res, next),
  );

  // CORS. Los orígenes permitidos vienen de `CORS_ORIGINS` (lista separada por
  // comas), que `run.sh` deriva de stack.config.json (URLs de los frontends
  // habilitados). Sin la variable o con `*`, se reflejan los orígenes (cómodo
  // en dev — evita fricción con localhost:<port>, 127.0.0.1, *.local, etc.).
  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const allowAll = corsOrigins.length === 0 || corsOrigins.includes('*');
  app.enableCors({
    origin: allowAll ? true : corsOrigins,
    credentials: true,
  });

  // Validación global. `whitelist` quita propiedades no declaradas en el DTO.
  // `forbidNonWhitelisted` devuelve 400 si llegan. `transform` aplica
  // conversiones (string → number, etc.).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // El filtro global de excepciones (`AppExceptionFilter`) se registra vía
  // `APP_FILTER` en `app.module.ts` para que reciba `ErrorLogService` por DI.

  const config = new DocumentBuilder()
    .setTitle('Core API')
    .setDescription('Core API — API-first, OpenAPI spec served at /docs-json')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    jsonDocumentUrl: 'docs-json',
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
