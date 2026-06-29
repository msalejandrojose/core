import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
bootstrap();
