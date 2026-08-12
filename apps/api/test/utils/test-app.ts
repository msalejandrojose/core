import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/infrastructure/database/prisma/prisma.service';

// Bootstrap de referencia para specs E2E: monta la app real (BBDD efímera de
// `.env.test` incluida, cargada por `test/jest-e2e.setup.ts`) con los mismos
// pipes globales que `main.ts` — sin eso, DTOs con `whitelist`/`transform`
// se comportarían distinto en test que en producción.
export async function bootTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  await app.init();
  return app;
}

export function getPrisma(app: INestApplication<App>): PrismaService {
  return app.get(PrismaService);
}
