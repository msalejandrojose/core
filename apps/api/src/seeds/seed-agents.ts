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
      'Para planificar la semana, mira el menú (brio_get_meal_plan) y pon en cada día y comida lo que la persona quiera comer (brio_plan_meal), con sus recetas (brio_list_recipes) o alimentos del catálogo. Si dice que se ha comido lo del menú, apúntalo con brio_log_planned_meal.',
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
      'Para hablar de su forma, mira el rendimiento (brio_get_performance) y el progreso (brio_get_progress); para el descanso, la salud del reloj (brio_get_health).',
    ].join('\n'),
  },
  {
    code: 'fotos-y-registro',
    name: 'Fotos y registro',
    description:
      'Qué hacer con las fotos y cómo apuntar, corregir y crear recetas.',
    instructions: [
      'Foto de comida: reconoce cada plato o alimento, estima los gramos por el tamaño (plato llano ≈ 26 cm) y apúntalo con brio_search_foods + brio_log_meal en la comida que toque por la hora. Di en una frase lo que has supuesto (p. ej. «unos 200 g de arroz») para que la persona lo corrija.',
      'Foto de una etiqueta nutricional: usa las kcal y macros de la etiqueta y la cantidad que diga la persona.',
      'Foto de la báscula: lee el peso (y la grasa si sale) y apúntalo con brio_log_weight.',
      'Captura de un entreno (Garmin, Strava, Hevy, la cinta del gimnasio…): saca tipo, duración, distancia y kcal si salen, y apúntalo con brio_log_workout.',
      'Si la foto no se ve bien o no sabes qué es, pregunta antes de apuntar nada.',
      'Para corregir algo apuntado, bórralo con brio_delete_meal (entryId de brio_get_day) y apunta lo correcto.',
      'Si la persona te da una receta, busca cada ingrediente (brio_search_foods), créala con brio_create_recipe con sus gramos y raciones, y dile las kcal por ración. Si además dice que se la ha comido, apúntala.',
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
    'brio_get_health',
    'brio_get_progress',
    'brio_get_performance',
    'brio_get_digestion',
    'brio_log_weight',
    'brio_delete_meal',
    'brio_create_recipe',
    'brio_list_recipes',
    'brio_get_meal_plan',
    'brio_plan_meal',
    'brio_remove_planned_meal',
    'brio_log_planned_meal',
  ],
  skills: ['tono-brio', 'nutricion', 'entrenamiento', 'fotos-y-registro'],
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
    // Lo editado en el backoffice se respeta: solo se añaden las herramientas y
    // skills nuevas de este seed que el agente aún no tenga.
    const current = (existing.tools ?? '').split(',').filter(Boolean);
    const missing = COACH.tools.filter((t) => !current.includes(t));
    if (missing.length) {
      await prisma.aiAgent.update({
        where: { id: existing.id },
        data: { tools: [...current, ...missing].join(',') },
      });
    }
    const linked = await prisma.aiAgentSkill.findMany({
      where: { agentId: existing.id },
      select: { skillId: true },
    });
    const skills = await prisma.aiSkill.findMany({
      where: {
        code: { in: COACH.skills },
        id: { notIn: linked.map((l) => l.skillId) },
      },
    });
    if (skills.length) {
      await prisma.aiAgentSkill.createMany({
        data: skills.map((sk) => ({ agentId: existing.id, skillId: sk.id })),
      });
    }
    console.log(
      `· agente brio-coach ya existe: +${missing.length} herramientas, +${skills.length} skills`,
    );
  }

  await app.close();
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
