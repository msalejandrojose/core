import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { ACTIVITY_KINDS, EXERCISES, type Muscle } from './brio-exercises.data';
import { TYPICAL_FOODS } from './brio-foods.data';

// Seed idempotente del catálogo global de Brío: tipos de actividad con su MET
// y un puñado de alimentos básicos verificados. Ambos con `ownerUserId` null =
// visibles para todo el mundo.
//
// Identificados por `code` / `name`, no por id: un re-run actualiza en vez de
// duplicar. Los MET salen del Compendium of Physical Activities (2011).

const ACTIVITY_TYPES: readonly {
  code: string;
  name: string;
  met: number;
  icon: string;
}[] = [
  { code: 'walking', name: 'Caminar', met: 3.5, icon: 'walk' },
  { code: 'running', name: 'Correr', met: 9.8, icon: 'footsteps' },
  { code: 'cycling', name: 'Bicicleta', met: 7.5, icon: 'bicycle' },
  { code: 'swimming', name: 'Natación', met: 7.0, icon: 'water' },
  { code: 'strength', name: 'Pesas', met: 5.0, icon: 'barbell' },
  { code: 'hiit', name: 'HIIT', met: 8.5, icon: 'flash' },
  { code: 'football', name: 'Fútbol', met: 7.0, icon: 'football' },
  { code: 'padel', name: 'Pádel', met: 6.0, icon: 'tennisball' },
  { code: 'basketball', name: 'Baloncesto', met: 6.5, icon: 'basketball' },
  { code: 'yoga', name: 'Yoga', met: 3.0, icon: 'body' },
  { code: 'hiking', name: 'Senderismo', met: 6.0, icon: 'trail-sign' },
  { code: 'rowing', name: 'Remo', met: 7.0, icon: 'boat' },
  { code: 'elliptical', name: 'Elíptica', met: 5.0, icon: 'ellipse' },
  { code: 'dancing', name: 'Baile', met: 5.0, icon: 'musical-notes' },
  { code: 'climbing', name: 'Escalada', met: 8.0, icon: 'trending-up' },
  // Fuerza + carrera/estaciones (HYROX, entrenos híbridos): más gasto que pesas.
  { code: 'hybrid', name: 'Híbrido / HYROX', met: 8.0, icon: 'flash' },
  // ── Deportes de equipo ──
  { code: 'football_7', name: 'Fútbol 7', met: 8.0, icon: 'football' },
  { code: 'futsal', name: 'Fútbol sala', met: 8.0, icon: 'football' },
  { code: 'handball', name: 'Balonmano', met: 8.0, icon: 'basketball' },
  { code: 'volleyball', name: 'Voleibol', met: 4.0, icon: 'basketball' },
  { code: 'beach_volleyball', name: 'Vóley playa', met: 8.0, icon: 'sunny' },
  { code: 'rugby', name: 'Rugby', met: 8.3, icon: 'american-football' },
  { code: 'hockey', name: 'Hockey', met: 7.8, icon: 'golf' },
  { code: 'water_polo', name: 'Waterpolo', met: 10.0, icon: 'water' },
  // ── Raqueta ──
  { code: 'tennis', name: 'Tenis', met: 7.3, icon: 'tennisball' },
  {
    code: 'tennis_doubles',
    name: 'Tenis dobles',
    met: 6.0,
    icon: 'tennisball',
  },
  { code: 'squash', name: 'Squash', met: 7.3, icon: 'tennisball' },
  { code: 'badminton', name: 'Bádminton', met: 5.5, icon: 'tennisball' },
  { code: 'table_tennis', name: 'Ping-pong', met: 4.0, icon: 'tennisball' },
  { code: 'fronton', name: 'Frontón', met: 7.0, icon: 'tennisball' },
  // ── Combate ──
  { code: 'boxing', name: 'Boxeo', met: 7.8, icon: 'hand-left' },
  {
    code: 'martial_arts',
    name: 'Artes marciales',
    met: 10.3,
    icon: 'hand-left',
  },
  // ── Gimnasio y clases ──
  { code: 'crossfit', name: 'CrossFit', met: 8.0, icon: 'barbell' },
  { code: 'spinning', name: 'Spinning', met: 8.5, icon: 'bicycle' },
  { code: 'pilates', name: 'Pilates', met: 3.0, icon: 'body' },
  { code: 'functional', name: 'Entreno funcional', met: 6.0, icon: 'fitness' },
  // ── Aire libre ──
  {
    code: 'trail_running',
    name: 'Trail running',
    met: 9.0,
    icon: 'trail-sign',
  },
  {
    code: 'mountain_biking',
    name: 'Bici de montaña',
    met: 8.5,
    icon: 'bicycle',
  },
  { code: 'skiing', name: 'Esquí', met: 5.3, icon: 'snow' },
  {
    code: 'cross_country_skiing',
    name: 'Esquí de fondo',
    met: 9.0,
    icon: 'snow',
  },
  { code: 'snowboard', name: 'Snowboard', met: 5.3, icon: 'snow' },
  { code: 'surf', name: 'Surf', met: 3.0, icon: 'water' },
  { code: 'kayak', name: 'Kayak / piragüismo', met: 5.0, icon: 'boat' },
  { code: 'skating', name: 'Patinaje', met: 7.0, icon: 'speedometer' },
  { code: 'golf', name: 'Golf', met: 4.8, icon: 'golf' },
  { code: 'horse_riding', name: 'Hípica', met: 5.5, icon: 'paw' },
];

/** Valores por 100 g (o 100 ml en los líquidos). */
const FOODS: readonly {
  name: string;
  isLiquid?: boolean;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  servings?: { label: string; grams: number; isDefault?: boolean }[];
}[] = [
  {
    name: 'Arroz blanco cocido',
    kcal: 130,
    protein: 2.7,
    carbs: 28,
    fat: 0.3,
    servings: [{ label: '1 plato', grams: 200, isDefault: true }],
  },
  {
    name: 'Pechuga de pollo a la plancha',
    kcal: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    servings: [{ label: '1 filete', grams: 150, isDefault: true }],
  },
  {
    name: 'Huevo entero',
    kcal: 143,
    protein: 12.6,
    carbs: 0.7,
    fat: 9.5,
    servings: [{ label: '1 huevo (M)', grams: 55, isDefault: true }],
  },
  {
    name: 'Pan de trigo',
    kcal: 265,
    protein: 9,
    carbs: 49,
    fat: 3.2,
    servings: [{ label: '1 rebanada', grams: 30, isDefault: true }],
  },
  {
    name: 'Aceite de oliva virgen extra',
    isLiquid: true,
    kcal: 884,
    protein: 0,
    carbs: 0,
    fat: 100,
    servings: [{ label: '1 cuchara', grams: 10, isDefault: true }],
  },
  {
    name: 'Leche semidesnatada',
    isLiquid: true,
    kcal: 46,
    protein: 3.3,
    carbs: 4.8,
    fat: 1.6,
    servings: [{ label: '1 vaso', grams: 250, isDefault: true }],
  },
  {
    name: 'Plátano',
    kcal: 89,
    protein: 1.1,
    carbs: 23,
    fat: 0.3,
    servings: [{ label: '1 unidad', grams: 120, isDefault: true }],
  },
  {
    name: 'Manzana',
    kcal: 52,
    protein: 0.3,
    carbs: 14,
    fat: 0.2,
    servings: [{ label: '1 unidad', grams: 180, isDefault: true }],
  },
  {
    name: 'Yogur natural',
    kcal: 61,
    protein: 3.5,
    carbs: 4.7,
    fat: 3.3,
    servings: [{ label: '1 unidad', grams: 125, isDefault: true }],
  },
  {
    name: 'Lentejas cocidas',
    kcal: 116,
    protein: 9,
    carbs: 20,
    fat: 0.4,
    servings: [{ label: '1 plato', grams: 250, isDefault: true }],
  },
  {
    name: 'Atún al natural',
    kcal: 108,
    protein: 24,
    carbs: 0,
    fat: 1,
    servings: [{ label: '1 lata (escurrida)', grams: 52, isDefault: true }],
  },
  {
    name: 'Patata cocida',
    kcal: 87,
    protein: 1.9,
    carbs: 20,
    fat: 0.1,
  },
  {
    name: 'Aguacate',
    kcal: 160,
    protein: 2,
    carbs: 9,
    fat: 15,
    servings: [{ label: '1/2 unidad', grams: 100, isDefault: true }],
  },
  {
    name: 'Avena en copos',
    kcal: 389,
    protein: 17,
    carbs: 66,
    fat: 7,
    servings: [{ label: '1 taza', grams: 80, isDefault: true }],
  },
  {
    name: 'Almendras crudas',
    kcal: 579,
    protein: 21,
    carbs: 22,
    fat: 50,
    servings: [{ label: '1 puñado', grams: 30, isDefault: true }],
  },
];

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const prisma = app.get(PrismaService);

  for (const type of ACTIVITY_TYPES) {
    await prisma.brioActivityType.upsert({
      where: { code: type.code },
      update: {
        name: type.name,
        met: type.met,
        icon: type.icon,
        kind: (ACTIVITY_KINDS[type.code] ?? 'OTHER') as never,
      },
      create: {
        kind: (ACTIVITY_KINDS[type.code] ?? 'OTHER') as never,
        code: type.code,
        name: type.name,
        met: type.met,
        icon: type.icon,
        ownerUserId: null,
      },
    });
  }
  console.log(`✔ ${ACTIVITY_TYPES.length} tipos de actividad`);

  const allFoods = [...FOODS, ...TYPICAL_FOODS];
  for (const food of allFoods) {
    // Los alimentos globales no tienen clave natural única en el schema (el
    // único índice único es el barcode, y estos no lo traen), así que se busca
    // por nombre dentro del catálogo global antes de crear.
    const existing = await prisma.brioFood.findFirst({
      where: { name: food.name, ownerUserId: null },
      select: { id: true },
    });

    const values = {
      source: 'CURATED' as const,
      isVerified: true,
      isLiquid: food.isLiquid ?? false,
      kcalPer100: food.kcal,
      proteinPer100G: food.protein,
      carbsPer100G: food.carbs,
      fatPer100G: food.fat,
    };

    if (existing) {
      await prisma.brioFood.update({
        where: { id: existing.id },
        data: values,
      });
      continue;
    }

    await prisma.brioFood.create({
      data: {
        name: food.name,
        ownerUserId: null,
        ...values,
        servings: {
          create: (food.servings ?? []).map((s) => ({
            label: s.label,
            grams: s.grams,
            isDefault: s.isDefault ?? false,
          })),
        },
      },
    });
  }
  console.log(`✔ ${allFoods.length} alimentos del catálogo`);

  for (const ex of EXERCISES) {
    const values = {
      name: ex.name,
      isCompound: ex.compound ?? false,
      isBodyweight: ex.bodyweight ?? false,
      measure: ex.measure ?? 'REPS',
    };
    const row = await prisma.brioExercise.upsert({
      where: { code: ex.code },
      update: values,
      create: { code: ex.code, ownerUserId: null, ...values },
      select: { id: true, _count: { select: { muscles: true } } },
    });
    // Los pesos por músculo solo se siembran la primera vez: si alguien los
    // ha ajustado en la BBDD, un re-run no los pisa.
    if (row._count.muscles > 0) continue;
    const weights: [Muscle[], number][] = [
      [ex.p, 1],
      [ex.s ?? [], 0.5],
      [ex.i ?? [], 0.25],
    ];
    await prisma.brioExerciseMuscle.createMany({
      data: weights.flatMap(([muscles, weight]) =>
        muscles.map((muscle) => ({ exerciseId: row.id, muscle, weight })),
      ),
    });
  }
  console.log(`✔ ${EXERCISES.length} ejercicios de fuerza`);

  await app.close();
}

void main();
