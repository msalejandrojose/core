import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

/**
 * Genera el documento OpenAPI de la API **sin** levantar el servidor ni
 * conectar a la base de datos.
 *
 * Usa el "preview mode" de Nest (`preview: true`): construye el grafo de
 * módulos y registra las rutas para que Swagger pueda introspeccionarlas,
 * pero NO instancia providers ni ejecuta hooks de ciclo de vida
 * (`onModuleInit`), por lo que `PrismaService.$connect()` nunca se llama.
 *
 * Salida: JSON del spec OpenAPI en la ruta indicada por el primer argumento
 * (por defecto `openapi.json` en el cwd). Pensado para alimentar
 * `openapi-typescript` y generar el cliente tipado en CI sin Docker.
 */
async function generate(): Promise<void> {
  const outPath = resolve(process.argv[2] ?? 'openapi.json');

  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: false,
  });

  // Sin `setGlobalPrefix` aquí a propósito, igual que en `main.ts` antes de
  // aplicarlo: el spec debe reflejar las rutas del contrato (sin `/v1`), que
  // es lo que consume `openapi-typescript` para tipar `@core/api-client`.
  // El prefijo `/v1` es un detalle de transporte que cada cliente añade una
  // sola vez en su `baseUrl` (ver apps/mobile|backoffice/src/api/client.ts).

  const config = new DocumentBuilder()
    .setTitle('Core API')
    .setDescription('Core API — API-first, OpenAPI spec served at /docs-json')
    .setVersion('0.0.1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  writeFileSync(outPath, JSON.stringify(document, null, 2));
  await app.close();

  // eslint-disable-next-line no-console
  console.log(`OpenAPI spec escrito en ${outPath}`);
}

void generate();
