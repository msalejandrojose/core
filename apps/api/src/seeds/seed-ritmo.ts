import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { ACTIVITY_KINDS, EXERCISES, type Muscle } from './ritmo-exercises.data';

// Seed idempotente del catálogo global de Ritmo: tipos de actividad con su MET
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
    await prisma.ritmoActivityType.upsert({
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

  for (const food of FOODS) {
    // Los alimentos globales no tienen clave natural única en el schema (el
    // único índice único es el barcode, y estos no lo traen), así que se busca
    // por nombre dentro del catálogo global antes de crear.
    const existing = await prisma.ritmoFood.findFirst({
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
      await prisma.ritmoFood.update({
        where: { id: existing.id },
        data: values,
      });
      continue;
    }

    await prisma.ritmoFood.create({
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
  console.log(`✔ ${FOODS.length} alimentos del catálogo`);

  for (const ex of EXERCISES) {
    const values = {
      name: ex.name,
      isCompound: ex.compound ?? false,
      isBodyweight: ex.bodyweight ?? false,
    };
    const row = await prisma.ritmoExercise.upsert({
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
    await prisma.ritmoExerciseMuscle.createMany({
      data: weights.flatMap(([muscles, weight]) =>
        muscles.map((muscle) => ({ exerciseId: row.id, muscle, weight })),
      ),
    });
  }
  console.log(`✔ ${EXERCISES.length} ejercicios de fuerza`);

  await app.close();
}

void main();
