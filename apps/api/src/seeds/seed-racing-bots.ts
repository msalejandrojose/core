import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

// Seed idempotente del pool de cuentas-bot (TASK-323, tarea 5): rivales
// ficticios para completar una sala en vivo cuando no hay suficientes
// jugadores reales en cola. Son filas de `User` reales — hace falta porque
// `RacingLiveRaceParticipant.userId` tiene FK a `User` — marcadas aparte en
// `RacingBotAccount`. Nunca inician sesión: `passwordHash` null a propósito.
//
// Pool fijo identificado por email, no por id — un re-run no duplica nada.

const BOT_EMAILS_DOMAIN = 'bots.racing.internal';

const BOT_NAMES: readonly string[] = [
  'CPU Rayo',
  'CPU Trueno',
  'CPU Centella',
  'CPU Cometa',
  'CPU Relámpago',
  'CPU Turbo',
];

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);

  for (const [index, name] of BOT_NAMES.entries()) {
    const email = `bot-${String(index + 1).padStart(2, '0')}@${BOT_EMAILS_DOMAIN}`;

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        id: randomUUID(),
        email,
        passwordHash: null,
        firstName: name,
        userType: 'APP',
        isActive: true,
      },
      update: {},
    });

    await prisma.racingBotAccount.upsert({
      where: { userId: user.id },
      create: { userId: user.id },
      update: {},
    });

    console.log(`✓ bot "${name}" (${email})`);
  }

  console.log(`\n${BOT_NAMES.length} cuentas-bot sembradas (si faltaban).`);
  await app.close();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
