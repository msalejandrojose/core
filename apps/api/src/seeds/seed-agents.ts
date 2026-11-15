import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

/**
 * Carga inicial de los agentes de IA: modelos de OpenAI de GPT-6 Luna en
 * adelante con su precio estándar (USD por millón de tokens, contexto ≤272K,
 * según la página de precios de OpenAI en noviembre de 2026), unas skills y el
 * coach de Brío. Idempotente: los modelos actualizan precio y esfuerzos; las
 * skills y el agente solo se crean si no existen (lo que se edite en el
 * backoffice no se pisa).
 */

const MODELS = [
  {
    modelId: 'gpt-6-luna',
    label: 'GPT-6 Luna',
    input: 0.1,
    cached: 0.01,
    output: 0.5,
    efforts: 'none,low,medium,high,xhigh,max',
    order: 0,
  },
  {
    modelId: 'gpt-6.1-terra',
    label: 'GPT-6.1 Terra',
    input: 1,
    cached: 0.05,
    output: 5,
    efforts: 'none,low,medium,high,xhigh,max',
    order: 1,
  },
  {
    modelId: 'gpt-6.1-sol',
    label: 'GPT-6.1 Sol',
    input: 2,
    cached: 0.1,
    output: 10,
    efforts: 'low,medium,high,xhigh,max',
    order: 2,
  },
  {
    modelId: 'gpt-6-astra',
    label: 'GPT-6 Astra',
    input: 10,
    cached: 1,
    output: 50,
    efforts: 'low,medium,high,xhigh,max',
    order: 3,
  },
];

const SKILLS = [
  {
    code: 'nutricion',
    name: 'Nutrición',
    description: 'Cómo hablar de comida, calorías y macros.',
    instructions: [
      'Da consejos de alimentación prácticos y con comida normal de España (lo que hay en el catálogo).',
      'Usa las kcal y macros reales del día (brio_get_day) y el objetivo del perfil (brio_get_profile) antes de opinar.',
      'Si la persona te dice lo que ha comido, busca el alimento (brio_search_foods) y apúntalo (brio_log_meal) en el momento del día que toque; si no encuentras el plato, apúntalo con un nombre y unas kcal razonables y díselo.',
      'Nada de dietas extremas ni de bajar de 1.200 kcal; no hagas diagnósticos médicos.',
    ].join('\n'),
  },
  {
    code: 'entrenamiento',
    name: 'Entrenamiento',
    description: 'Consejos de entreno y apuntar sesiones.',
    instructions: [
      'Mira el plan de la semana (brio_get_plan_week) y la recuperación (brio_get_recovery) antes de recomendar entrenar fuerte.',
      'Si la persona cuenta un entreno hecho, busca el tipo (brio_list_activity_types) y apúntalo (brio_log_workout) con los minutos y, si los dice, la distancia y el esfuerzo.',
      'Prioriza la constancia y el descanso: si ha dormido mal o la carga es alta, propón algo suave.',
    ].join('\n'),
  },
  {
    code: 'tono-brio',
    name: 'Tono de Brío',
    description: 'Cómo habla el coach.',
    instructions: [
      'Habla en español de España, cercano y directo, como un buen entrenador personal.',
      'Respuestas cortas (3-6 frases) salvo que te pidan detalle. Sin listas largas.',
      'Cuando apuntes algo, dilo en una frase: qué, cuántas kcal y en qué comida.',
      'Si algo suena a problema de salud (dolor, mareos, sangre, trastornos alimentarios), recomienda ir al médico.',
    ].join('\n'),
  },
];

const COACH = {
  code: 'brio-coach',
  name: 'Coach de Brío',
  description:
    'El coach de la app: consejo de comida y entreno, y apunta lo que le cuentes.',
  instructions:
    'Eres el coach de Brío, una app de actividad física, plan de entrenamiento y calorías. Ayudas a la persona con lo que come, sus entrenos y su descanso usando sus datos reales de la app. Antes de responder sobre su día, consulta los datos con las herramientas; no te inventes cifras.',
  model: 'gpt-6-luna',
  effort: 'low',
  maxOutputTokens: 1200,
  tools: [
    'brio_get_day',
    'brio_get_profile',
    'brio_search_foods',
    'brio_log_meal',
    'brio_list_activity_types',
    'brio_log_workout',
    'brio_get_plan_week',
    'brio_get_recovery',
  ],
  skills: ['tono-brio', 'nutricion', 'entrenamiento'],
};

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);

  for (const m of MODELS) {
    const values = {
      provider: 'OPENAI',
      label: m.label,
      inputPricePerM: m.input,
      cachedInputPricePerM: m.cached,
      outputPricePerM: m.output,
      efforts: m.efforts,
      sortOrder: m.order,
    };
    await prisma.aiModel.upsert({
      where: { modelId: m.modelId },
      update: values,
      create: { modelId: m.modelId, ...values },
    });
  }
  console.log(`✔ ${MODELS.length} modelos de IA`);

  for (const s of SKILLS) {
    await prisma.aiSkill.upsert({
      where: { code: s.code },
      update: {},
      create: { ...s, enabled: true },
    });
  }
  console.log(`✔ ${SKILLS.length} skills`);

  const existing = await prisma.aiAgent.findUnique({
    where: { code: COACH.code },
  });
  if (!existing) {
    const model = await prisma.aiModel.findUniqueOrThrow({
      where: { modelId: COACH.model },
    });
    const skills = await prisma.aiSkill.findMany({
      where: { code: { in: COACH.skills } },
    });
    await prisma.aiAgent.create({
      data: {
        code: COACH.code,
        name: COACH.name,
        description: COACH.description,
        instructions: COACH.instructions,
        modelId: model.id,
        reasoningEffort: COACH.effort,
        maxOutputTokens: COACH.maxOutputTokens,
        tools: COACH.tools.join(','),
        skills: { create: skills.map((s) => ({ skillId: s.id })) },
      },
    });
    console.log('✔ agente brio-coach creado');
  } else {
    console.log('· agente brio-coach ya existe (no se toca)');
  }

  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
