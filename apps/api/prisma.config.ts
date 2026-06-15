// Configuración para la CLI de Prisma (prisma migrate, prisma db pull, etc.).
// El runtime de la API NO usa este archivo — la URL se compone allí desde las
// variables DB_* y se inyecta vía driver adapter en PrismaClient.
//
// La CLI lee este archivo desde el cwd, así que los comandos prisma se ejecutan
// desde `apps/api/`.

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
    // Solo se usa con `prisma migrate dev` (no en deploy ni en runtime).
    // El user de la conexión normal no tiene CREATE DATABASE en MySQL local.
    shadowDatabaseUrl: process.env['SHADOW_DATABASE_URL'],
  },
});
