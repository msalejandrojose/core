import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { CreateSendingAccountTypeUseCase } from '../modules/notifications/application/use-cases/create-sending-account-type.use-case';
import { CreateSendingAccountUseCase } from '../modules/notifications/application/use-cases/create-sending-account.use-case';
import { CreateMessageTypeUseCase } from '../modules/notifications/application/use-cases/create-message-type.use-case';
import { PublishWorkflowDefinitionUseCase } from '../modules/workflows/application/use-cases/publish-workflow-definition.use-case';

// Seed idempotente del catálogo de push de racing (TASK-255). Crea:
//   1. El `SendingAccountType` de canal PUSH (compartido por todo el sistema,
//      no solo racing — pero nadie lo había dado de alta todavía en este
//      entorno; el resto del circuito —POST/DELETE /me/devices, dispatcher
//      FCM, handler de workflow notify.push— ya existe en código, ver
//      TASK-252).
//   2. Una `SendingAccount` "FCM — dev", con un `serverKey` de relleno: SIN
//      una key real de FCM, cualquier envío de verdad fallará (a diferencia
//      de EMAIL, `serverKey` es un campo requerido del catálogo, así que no
//      se puede omitir). Sustituir por la key real vía backoffice antes de
//      enviar push de verdad.
//   3. Una plantilla `MessageType` de ejemplo: "cierre de temporada"
//      (TASK-228, ya implementada), para validar el circuito de catálogo →
//      workflow → dispatcher de punta a punta.
//   4. Un workflow demo (TASK-254) de disparo manual cuya única acción es
//      `notify.push` contra esa plantilla — para probar desde el backoffice
//      (o `POST /workflows/definitions/:key/run?dryRun=true`) que el
//      circuito completo funciona sin depender de que exista ya un
//      dispositivo real registrado.
//
// El `deepLink` es un string libre para el cliente Godot, que TODAVÍA no
// sabe interpretarlo (el registro de dispositivo — "Godot: registrar el
// dispositivo para recibir push" — sigue sin construir): aquí solo se fija
// la convención (identificador de pantalla en snake_case) para cuando el
// receptor del deep link se construya.
//
// Correrlo varias veces no duplica: busca por key/nombre.
//
//   pnpm --filter @core/api seed:racing-push-notifications

const TYPE_KEY = 'push';
const ACCOUNT_NAME = 'FCM — dev';
const PLACEHOLDER_SERVER_KEY = 'REPLACE_WITH_REAL_FCM_SERVER_KEY';
const MESSAGE_TYPE_KEY = 'racing_season_closed';
const WORKFLOW_KEY = 'notify_racing_season_closed_demo';

function buildDemoDsl(): unknown {
  return {
    key: WORKFLOW_KEY,
    name: 'Demo: push de cierre de temporada (racing)',
    version: 1,
    meta: {
      description:
        'Workflow de ejemplo (TASK-254): dispara notify.push contra racing_season_closed. Payload: { userId, firstName, seasonName }.',
    },
    triggers: [{ kind: 'manual' }],
    steps: [
      {
        key: 'send_push',
        action: 'notify.push',
        input: {
          userId: '{{ event.payload.userId }}',
          messageTypeKey: MESSAGE_TYPE_KEY,
          variables: {
            firstName: '{{ event.payload.firstName }}',
            seasonName: '{{ event.payload.seasonName }}',
          },
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

  // 1. Tipo de cuenta PUSH (idempotente por key).
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
      name: 'Push (FCM)',
      channel: 'PUSH',
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
        provider: 'fcm',
        serverKey: PLACEHOLDER_SERVER_KEY,
      },
      isDefault: true,
    });
    accountId = account.id;
    console.log(`Cuenta creada: ${ACCOUNT_NAME}`);
    console.log(
      '  ⚠️  serverKey de relleno — sustituir por la key real de FCM vía backoffice antes de enviar push de verdad.',
    );
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
      name: 'Racing: cierre de temporada',
      accountId,
      content: {
        title: '¡{{ seasonName }} ha terminado!',
        body: 'Hola {{ firstName }}, ya puedes ver cómo quedaste y la nueva temporada ha empezado.',
        deepLink: 'season_summary',
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

  console.log('\n✔ Catálogo de push de racing listo.');
  console.log(`  Tipo de mensaje:  ${MESSAGE_TYPE_KEY}`);
  console.log(`  Workflow demo:    ${WORKFLOW_KEY}`);
  console.log(
    `  Probar sin enviar: POST /workflows/definitions/${WORKFLOW_KEY}/run?dryRun=true`,
  );

  await app.close();
}

void main();
