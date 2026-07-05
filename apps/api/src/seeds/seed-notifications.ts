import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { CreateSendingAccountTypeUseCase } from '../modules/notifications/application/use-cases/create-sending-account-type.use-case';
import { CreateSendingAccountUseCase } from '../modules/notifications/application/use-cases/create-sending-account.use-case';
import { CreateMessageTypeUseCase } from '../modules/notifications/application/use-cases/create-message-type.use-case';
import { PublishWorkflowDefinitionUseCase } from '../modules/workflows/application/use-cases/publish-workflow-definition.use-case';

// Seed idempotente del sistema de notificaciones. Crea:
//   1. Un `SendingAccountType` de canal EMAIL.
//   2. Una `SendingAccount` "Resend — dev" (sin apiKey propia ⇒ delega en el
//      mailer global; en prod se pondría la key real, que se guarda cifrada).
//   3. Un `MessageType` "welcome_email" con plantillas `{{ firstName }}`.
//   4. Un workflow demo (trigger manual) cuya única acción es `notifications.send`.
//
// Correrlo varias veces no duplica: busca por key/nombre.
//
//   pnpm --filter @core/api seed:notifications

const TYPE_KEY = 'email';
const ACCOUNT_NAME = 'Resend — dev';
const MESSAGE_TYPE_KEY = 'welcome_email';
const WORKFLOW_KEY = 'notify_welcome_email_demo';

function buildDemoDsl(): unknown {
  return {
    key: WORKFLOW_KEY,
    name: 'Demo: enviar email de bienvenida',
    version: 1,
    meta: {
      description:
        'Workflow de ejemplo: dispara notifications.send con el tipo de mensaje welcome_email.',
    },
    triggers: [{ kind: 'manual' }],
    steps: [
      {
        key: 'send_welcome',
        action: 'notifications.send',
        input: {
          messageTypeKey: MESSAGE_TYPE_KEY,
          to: '{{ context.email }}',
          variables: { firstName: '{{ context.firstName }}' },
        },
        next: null,
      },
    ],
  };
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });

  const prisma = app.get(PrismaService);
  const createType = app.get(CreateSendingAccountTypeUseCase);
  const createAccount = app.get(CreateSendingAccountUseCase);
  const createMessageType = app.get(CreateMessageTypeUseCase);
  const publishWorkflow = app.get(PublishWorkflowDefinitionUseCase);

  // 1. Tipo de cuenta EMAIL (idempotente por key).
  let typeId: string;
  const existingType = await prisma.sendingAccountType.findUnique({
    where: { key: TYPE_KEY },
  });
  if (existingType) {
    typeId = existingType.id;
    console.log(`Tipo ya existía: ${TYPE_KEY}`);
  } else {
    const type = await createType.execute({
      key: TYPE_KEY,
      name: 'Email',
      channel: 'EMAIL',
    });
    typeId = type.id;
    console.log(`Tipo creado: ${TYPE_KEY} (${type.channel})`);
  }

  // 2. Cuenta de envío (idempotente por nombre).
  let accountId: string;
  const existingAccount = await prisma.sendingAccount.findFirst({
    where: { name: ACCOUNT_NAME },
  });
  if (existingAccount) {
    accountId = existingAccount.id;
    console.log(`Cuenta ya existía: ${ACCOUNT_NAME}`);
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

  // 3. Tipo de mensaje (idempotente por key).
  const existingMessageType = await prisma.messageType.findUnique({
    where: { key: MESSAGE_TYPE_KEY },
  });
  if (existingMessageType) {
    console.log(`Tipo de mensaje ya existía: ${MESSAGE_TYPE_KEY}`);
  } else {
    await createMessageType.execute({
      key: MESSAGE_TYPE_KEY,
      name: 'Email de bienvenida',
      accountId,
      content: {
        subject: 'Bienvenido/a, {{ firstName }} 👋',
        html: '<p>Hola {{ firstName }}, ¡te damos la bienvenida a Core!</p>',
        text: 'Hola {{ firstName }}, ¡te damos la bienvenida a Core!',
      },
    });
    console.log(`Tipo de mensaje creado: ${MESSAGE_TYPE_KEY}`);
  }

  // 4. Workflow demo (idempotente por key).
  const existingWorkflow = await prisma.workflowDefinition.findFirst({
    where: { key: WORKFLOW_KEY },
  });
  if (existingWorkflow) {
    console.log(`Workflow ya existía: ${WORKFLOW_KEY}`);
  } else {
    await publishWorkflow.execute(buildDemoDsl());
    console.log(`Workflow publicado y activo: ${WORKFLOW_KEY}`);
  }

  console.log('\n✔ Notificaciones listas.');
  console.log(`  Tipo de mensaje:  ${MESSAGE_TYPE_KEY}`);
  console.log(`  Preview (API):    POST /message-types/:id/preview`);
  console.log(`  Acción workflow:  notifications.send`);

  await app.close();
}

void main();
