import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { CreateFormUseCase } from '../modules/dynamic-forms/application/use-cases/create-form.use-case';
import { UpdateFormUseCase } from '../modules/dynamic-forms/application/use-cases/update-form.use-case';
import { CreateFormInstanceUseCase } from '../modules/dynamic-forms/application/use-cases/create-form-instance.use-case';
import { PublishWorkflowDefinitionUseCase } from '../modules/workflows/application/use-cases/publish-workflow-definition.use-case';

// Seed idempotente de la captación web de leads vía workflow. Crea:
//   1. Un `Form` dinámico con los campos del formulario público (incl. UTMs
//      ocultos + consentimiento).
//   2. Una `FormInstance` pública (hash opaco en la URL).
//   3. Un `WorkflowDefinition` activo cuyo trigger escucha
//      `form.response.submitted` (filtrado por el hash de la instancia) y cuya
//      única acción `leads.create_from_response` mapea la respuesta a un lead.
//
// Correrlo varias veces no duplica: busca por título de form, instancia ACTIVE
// y key de workflow.
//
//   pnpm --filter @core/api seed:leads

const FORM_TITLE = 'Captación web (leads)';
const WORKFLOW_KEY = 'leads_capture_from_web';

const FORM_SCHEMA = {
  version: 1,
  fields: [
    { key: 'nombre', type: 'text', label: 'Nombre', required: true },
    { key: 'apellidos', type: 'text', label: 'Apellidos' },
    { key: 'email', type: 'email', label: 'Email', required: true },
    { key: 'telefono', type: 'text', label: 'Teléfono' },
    { key: 'empresa', type: 'text', label: 'Empresa' },
    { key: 'mensaje', type: 'textarea', label: '¿En qué podemos ayudarte?' },
    {
      key: 'consentimiento',
      type: 'checkbox',
      label: 'Acepto que me contactéis con los datos facilitados.',
      required: true,
    },
    { key: 'utm_source', type: 'hidden' },
    { key: 'utm_medium', type: 'hidden' },
    { key: 'utm_campaign', type: 'hidden' },
  ],
};

// Mapeo fieldKey de la respuesta → campo del lead. Es la config del step
// `leads.create_from_response` (su inputSchema).
const CAPTURE_MAPPING = {
  fieldMap: {
    email: 'email',
    phone: 'telefono',
    firstName: 'nombre',
    lastName: 'apellidos',
    company: 'empresa',
  },
  utmKeys: {
    source: 'utm_source',
    medium: 'utm_medium',
    campaign: 'utm_campaign',
  },
  consentKey: 'consentimiento',
  customFieldKeys: ['mensaje'],
  source: 'WEB_FORM',
};

function buildDsl(formInstanceHash: string) {
  return {
    key: WORKFLOW_KEY,
    name: 'Captación web → crea lead',
    version: 1,
    meta: {
      description:
        'Al enviarse el formulario de captación, crea un lead mapeando los campos de la respuesta.',
    },
    triggers: [
      {
        kind: 'event',
        eventType: 'form.response.submitted',
        // Solo esta instancia de formulario dispara la creación del lead.
        match: { formInstanceHash: { eq: formInstanceHash } },
      },
    ],
    steps: [
      {
        key: 'create_lead',
        action: 'leads.create_from_response',
        input: CAPTURE_MAPPING,
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
  const createForm = app.get(CreateFormUseCase);
  const updateForm = app.get(UpdateFormUseCase);
  const createInstance = app.get(CreateFormInstanceUseCase);
  const publishWorkflow = app.get(PublishWorkflowDefinitionUseCase);

  // 1. Form (idempotente por título).
  let formId: string;
  const existingForm = await prisma.form.findFirst({
    where: { title: FORM_TITLE },
  });
  if (existingForm) {
    formId = existingForm.id;
    console.log(`Form ya existía: ${formId}`);
  } else {
    const created = await createForm.execute({
      title: FORM_TITLE,
      description: 'Formulario público de captación de leads.',
      schema: FORM_SCHEMA,
    });
    await updateForm.execute({ id: created.id, status: 'PUBLISHED' });
    formId = created.id;
    console.log(`Form creado: ${formId}`);
  }

  // 2. FormInstance pública (reusa una ACTIVE si existe).
  let hash: string;
  const existingInstance = await prisma.formInstance.findFirst({
    where: { formId, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });
  if (existingInstance) {
    hash = existingInstance.hash;
    console.log(`FormInstance ya existía: hash=${hash}`);
  } else {
    const created = await createInstance.execute({
      formId,
      responsePolicy: 'UNLIMITED',
    });
    hash = created.hash;
    console.log(`FormInstance creada: hash=${hash}`);
  }

  // 3. Workflow (idempotente por key). La 1ª versión queda activa al publicar.
  const existingWorkflow = await prisma.workflowDefinition.findFirst({
    where: { key: WORKFLOW_KEY },
  });
  if (existingWorkflow) {
    console.log(`Workflow ya existía: ${WORKFLOW_KEY}`);
  } else {
    await publishWorkflow.execute(buildDsl(hash));
    console.log(`Workflow publicado y activo: ${WORKFLOW_KEY}`);
  }

  console.log('\n✔ Captación web lista.');
  console.log(`  Form público (API):  GET  /public/forms/${hash}`);
  console.log(`  Envío de respuesta:  POST /public/forms/${hash}/responses`);
  console.log(
    '  Al enviar → evento form.response.submitted → workflow → lead creado.',
  );

  await app.close();
}

void main();
