import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';

// Stub de PrismaService: evita necesitar una BBDD real. Emula fielmente al
// cliente SQL de Prisma 7: `PrismaHealthIndicator` llama primero a
// `$runCommandRaw` (comando Mongo) y solo cae a `$queryRawUnsafe('SELECT 1')`
// cuando el error contiene "Use the mongodb provider" — que es justo lo que el
// cliente MySQL generado lanza. `healthy` decide si el `SELECT 1` responde.
function prismaStub(healthy: boolean) {
  return {
    onModuleInit: async () => {},
    onModuleDestroy: async () => {},
    $runCommandRaw: () => {
      throw new Error(
        'The mysql provider does not support $runCommandRaw. Use the mongodb provider.',
      );
    },
    $queryRawUnsafe: async () => {
      if (!healthy) throw new Error('DB unreachable');
      return [{ '1': 1 }];
    },
  };
}

async function bootApp(healthy: boolean): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue(prismaStub(healthy))
    .compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

describe('Health (e2e)', () => {
  describe('con la BBDD sana', () => {
    let app: INestApplication<App>;
    beforeAll(async () => {
      app = await bootApp(true);
    });
    afterAll(async () => {
      await app.close();
    });

    it('GET /health/live devuelve 200 sin tocar la BBDD', () => {
      return request(app.getHttpServer())
        .get('/health/live')
        .expect(200)
        .expect({ status: 'ok' });
    });

    it('GET /health devuelve 200 y el check de BBDD en up (sin auth)', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.details.database.status).toBe('up');
        });
    });
  });

  describe('con la BBDD caída', () => {
    let app: INestApplication<App>;
    beforeAll(async () => {
      app = await bootApp(false);
    });
    afterAll(async () => {
      await app.close();
    });

    it('GET /health devuelve 503 con el check de BBDD en down', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(503)
        .expect((res) => {
          expect(res.body.status).toBe('error');
          expect(res.body.details.database.status).toBe('down');
        });
    });

    it('GET /health/live sigue devolviendo 200 aunque la BBDD esté caída', () => {
      return request(app.getHttpServer())
        .get('/health/live')
        .expect(200)
        .expect({ status: 'ok' });
    });
  });
});
