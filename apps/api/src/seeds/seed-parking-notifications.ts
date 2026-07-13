import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { CreateSendingAccountTypeUseCase } from '../modules/notifications/application/use-cases/create-sending-account-type.use-case';
import { CreateSendingAccountUseCase } from '../modules/notifications/application/use-cases/create-sending-account.use-case';
import { CreateMessageTypeUseCase } from '../modules/notifications/application/use-cases/create-message-type.use-case';

// Seed idempotente de las notificaciones de reserva de Plazza (TASK-149):
//   1. Reutiliza (o crea) el `SendingAccountType`/`SendingAccount` EMAIL —
//      mismos que `seed-notifications.ts`.
//   2. Crea los dos `MessageType` que dispara el módulo `parking`:
//      "parking_reservation_requested" (al host) y
//      "parking_reservation_confirmed" (al huésped).
//
// Correrlo varias veces no duplica: busca por key/nombre.
//
//   pnpm --filter @core/api seed:parking-notifications

const TYPE_KEY = 'email';
const ACCOUNT_NAME = 'Resend — dev';
const REQUESTED_KEY = 'parking_reservation_requested';
const CONFIRMED_KEY = 'parking_reservation_confirmed';

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });

  const prisma = app.get(PrismaService);
  const createType = app.get(CreateSendingAccountTypeUseCase);
  const createAccount = app.get(CreateSendingAccountUseCase);
  const createMessageType = app.get(CreateMessageTypeUseCase);

  // 1. Tipo de cuenta EMAIL (idempotente por key, compartido con seed-notifications.ts).
  let typeId: string;
  const existingType = await prisma.sendingAccountType.findUnique({
    where: { key: TYPE_KEY },
  });
  if (existingType) {
    typeId = existingType.id;
  } else {
    const type = await createType.execute({
      key: TYPE_KEY,
      name: 'Email',
      channel: 'EMAIL',
    });
    typeId = type.id;
    console.log(`Tipo creado: ${TYPE_KEY} (${type.channel})`);
  }

  // 2. Cuenta de envío (idempotente por nombre, compartida con seed-notifications.ts).
  let accountId: string;
  const existingAccount = await prisma.sendingAccount.findFirst({
    where: { name: ACCOUNT_NAME },
  });
  if (existingAccount) {
    accountId = existingAccount.id;
  } else {
    const account = await createAccount.execute({
      typeId,
      name: ACCOUNT_NAME,
      config: {
        provider: 'resend',
        fromEmail: 'noreply@aj-local.es',
        fromName: 'Core',
      },
      isDefault: true,
    });
    accountId = account.id;
    console.log(`Cuenta creada: ${ACCOUNT_NAME}`);
  }

  // 3. Tipo de mensaje: aviso al host de una nueva solicitud de reserva.
  const existingRequested = await prisma.messageType.findUnique({
    where: { key: REQUESTED_KEY },
  });
  if (existingRequested) {
    console.log(`Tipo de mensaje ya existía: ${REQUESTED_KEY}`);
  } else {
    await createMessageType.execute({
      key: REQUESTED_KEY,
      name: 'Plazza — nueva solicitud de reserva',
      accountId,
      content: {
        subject: 'Nueva solicitud de reserva para "{{ parkingTitle }}"',
        html: '<p>Tienes una nueva solicitud de reserva para <strong>{{ parkingTitle }}</strong>, del {{ startDate }} al {{ endDate }} ({{ totalAmount }} €). Confírmala desde tu panel de host.</p>',
        text: 'Tienes una nueva solicitud de reserva para {{ parkingTitle }}, del {{ startDate }} al {{ endDate }} ({{ totalAmount }} €). Confírmala desde tu panel de host.',
      },
    });
    console.log(`Tipo de mensaje creado: ${REQUESTED_KEY}`);
  }

  // 4. Tipo de mensaje: confirmación al huésped.
  const existingConfirmed = await prisma.messageType.findUnique({
    where: { key: CONFIRMED_KEY },
  });
  if (existingConfirmed) {
    console.log(`Tipo de mensaje ya existía: ${CONFIRMED_KEY}`);
  } else {
    await createMessageType.execute({
      key: CONFIRMED_KEY,
      name: 'Plazza — reserva confirmada',
      accountId,
      content: {
        subject: '¡Tu reserva en "{{ parkingTitle }}" está confirmada!',
        html: '<p>El host ha confirmado tu reserva en <strong>{{ parkingTitle }}</strong> ({{ address }}), del {{ startDate }} al {{ endDate }} ({{ totalAmount }} €).</p>',
        text: 'El host ha confirmado tu reserva en {{ parkingTitle }} ({{ address }}), del {{ startDate }} al {{ endDate }} ({{ totalAmount }} €).',
      },
    });
    console.log(`Tipo de mensaje creado: ${CONFIRMED_KEY}`);
  }

  console.log('\n✔ Notificaciones de reserva de Plazza listas.');
  await app.close();
}

void main();
