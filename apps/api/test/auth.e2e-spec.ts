import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { PrismaService } from '../src/infrastructure/database/prisma/prisma.service';
import { bootTestApp, getPrisma } from './utils/test-app';
import { cleanDatabase } from './utils/clean-database';

// Patrón de referencia para specs E2E: register → verify-email → login → me.
// El registro deja al usuario inactivo (`isActive: false`) hasta que verifica
// el email, así que leemos el token de verificación directamente de la BBDD
// (el envío real de email cae en el `NullMailerAdapter` — no hay `MAIL_API_KEY`
// en `.env.test` — y el registro lo trata como best-effort de todos modos).
describe('Auth flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const credentials = {
    email: 'e2e-auth@core.dev',
    password: 'Sup3rSecret!',
    userType: 'BACKOFFICE' as const,
  };

  beforeAll(async () => {
    app = await bootTestApp();
    prisma = getPrisma(app);
  });

  afterEach(async () => {
    await cleanDatabase(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function registerAndVerify(): Promise<void> {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: credentials.email },
    });
    expect(user.emailVerificationToken).toBeTruthy();

    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: user.emailVerificationToken })
      .expect(200);
  }

  it('POST /auth/register crea un usuario inactivo y devuelve el DTO público', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);

    expect(res.body).toMatchObject({
      email: credentials.email,
      userType: credentials.userType,
    });
    expect(res.body.password).toBeUndefined();
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('POST /auth/register con un email ya existente devuelve 409', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(409);
  });

  it('POST /auth/login antes de verificar el email devuelve 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(credentials)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(401);
  });

  it('flujo completo: register → verify-email → login → me', async () => {
    await registerAndVerify();

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);

    expect(loginRes.body.accessToken).toEqual(expect.any(String));
    expect(loginRes.body.user.email).toBe(credentials.email);

    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
      .expect(200);

    expect(meRes.body.email).toBe(credentials.email);
  });

  it('POST /auth/login con password incorrecta devuelve 401', async () => {
    await registerAndVerify();

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: credentials.email, password: 'wrong-password' })
      .expect(401);
  });

  it('GET /auth/me sin token devuelve 401', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });
});
