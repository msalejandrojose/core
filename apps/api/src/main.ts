import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { DomainErrorFilter } from './shared/filters/domain-error.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  // Mapea DomainError subclasses a respuestas HTTP estructuradas.
  app.useGlobalFilters(new DomainErrorFilter());

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
