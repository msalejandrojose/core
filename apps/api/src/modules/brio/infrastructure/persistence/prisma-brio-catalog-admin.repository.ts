import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import type { BrioMuscle } from '../../../../generated/prisma/enums';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type {
  AdminActivityType,
  AdminExercise,
  AdminFood,
  BrioCatalogAdminPort,
  SaveActivityTypeInput,
  SaveExerciseInput,
  SaveFoodInput,
} from '../../application/ports/catalog-admin.port';

const FOOD_INCLUDE = {
  servings: { orderBy: [{ isDefault: 'desc' }, { grams: 'asc' }] },
  _count: { select: { mealEntries: true } },
} satisfies Prisma.BrioFoodInclude;

type FoodRow = Prisma.BrioFoodGetPayload<{ include: typeof FOOD_INCLUDE }>;

const toFood = (r: FoodRow): AdminFood => ({
  id: r.id,
  name: r.name,
  brand: r.brand,
  barcode: r.barcode,
  source: r.source,
  isVerified: r.isVerified,
  isLiquid: r.isLiquid,
  kcalPer100: r.kcalPer100,
  proteinPer100G: Number(r.proteinPer100G),
  carbsPer100G: Number(r.carbsPer100G),
  fatPer100G: Number(r.fatPer100G),
  servings: r.servings.map((s) => ({
    label: s.label,
    grams: Number(s.grams),
    isDefault: s.isDefault,
  })),
  uses: r._count.mealEntries,
});

const EXERCISE_INCLUDE = {
  muscles: { orderBy: { weight: 'desc' } },
  _count: { select: { sets: true } },
} satisfies Prisma.BrioExerciseInclude;

type ExerciseRow = Prisma.BrioExerciseGetPayload<{
  include: typeof EXERCISE_INCLUDE;
}>;

const toExercise = (r: ExerciseRow): AdminExercise => ({
  id: r.id,
  code: r.code,
  name: r.name,
  measure: r.measure,
  isCompound: r.isCompound,
  isBodyweight: r.isBodyweight,
  isArchived: r.isArchived,
  muscles: r.muscles.map((m) => ({
    muscle: m.muscle,
    weight: Number(m.weight),
  })),
  uses: r._count.sets,
});

const TYPE_INCLUDE = {
  _count: { select: { sessions: true } },
} satisfies Prisma.BrioActivityTypeInclude;

type TypeRow = Prisma.BrioActivityTypeGetPayload<{
  include: typeof TYPE_INCLUDE;
}>;

const toType = (r: TypeRow): AdminActivityType => ({
  id: r.id,
  code: r.code,
  name: r.name,
  met: Number(r.met),
  kind: r.kind,
  icon: r.icon,
  isArchived: r.isArchived,
  uses: r._count.sessions,
});

/** El caso de uso ya validó los músculos contra la lista del MuscleEngine. */
const muscleRows = (muscles: SaveExerciseInput['muscles']) =>
  muscles.map((m) => ({ muscle: m.muscle as BrioMuscle, weight: m.weight }));

const foodFields = (input: SaveFoodInput) => ({
  name: input.name,
  brand: input.brand,
  barcode: input.barcode,
  isVerified: input.isVerified,
  isLiquid: input.isLiquid,
  kcalPer100: input.kcalPer100,
  proteinPer100G: input.proteinPer100G,
  carbsPer100G: input.carbsPer100G,
  fatPer100G: input.fatPer100G,
});

/** Solo los catálogos globales (sin dueño): lo que crea cada usuario no se toca aquí. */
@Injectable()
export class PrismaBrioCatalogAdminRepository implements BrioCatalogAdminPort {
  constructor(private readonly prisma: PrismaService) {}

  async listFoods(q: {
    search: string | null;
    source: AdminFood['source'] | null;
    unverified: boolean;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.BrioFoodWhereInput = {
      ownerUserId: null,
      ...(q.source ? { source: q.source } : {}),
      ...(q.unverified ? { isVerified: false } : {}),
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search } },
              { brand: { contains: q.search } },
              { barcode: q.search },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.brioFood.findMany({
        where,
        include: FOOD_INCLUDE,
        orderBy: [{ isVerified: 'asc' }, { name: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
      this.prisma.brioFood.count({ where }),
    ]);
    return { data: rows.map(toFood), total };
  }

  async createFood(input: SaveFoodInput) {
    const row = await this.prisma.brioFood.create({
      data: {
        ...foodFields(input),
        source: 'CURATED',
        ownerUserId: null,
        servings: { create: input.servings },
      },
      include: FOOD_INCLUDE,
    });
    return toFood(row);
  }

  async updateFood(id: string, input: SaveFoodInput) {
    const found = await this.prisma.brioFood.count({
      where: { id, ownerUserId: null },
    });
    if (!found) return null;
    // Las raciones se casan por etiqueta: las que siguen conservan su id (y las
    // comidas apuntadas con ellas), las nuevas se crean y las que sobran se van.
    const labels = input.servings.map((s) => s.label);
    await this.prisma.$transaction([
      this.prisma.brioFoodServing.deleteMany({
        where: { foodId: id, label: { notIn: labels } },
      }),
      ...input.servings.map((s) =>
        this.prisma.brioFoodServing.upsert({
          where: { foodId_label: { foodId: id, label: s.label } },
          update: { grams: s.grams, isDefault: s.isDefault },
          create: { foodId: id, ...s },
        }),
      ),
      this.prisma.brioFood.update({ where: { id }, data: foodFields(input) }),
    ]);
    const row = await this.prisma.brioFood.findUniqueOrThrow({
      where: { id },
      include: FOOD_INCLUDE,
    });
    return toFood(row);
  }

  async deleteFood(id: string) {
    const r = await this.prisma.brioFood.deleteMany({
      where: { id, ownerUserId: null },
    });
    return r.count > 0;
  }

  async barcodeTaken(barcode: string, exceptId: string | null) {
    const n = await this.prisma.brioFood.count({
      where: { barcode, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    });
    return n > 0;
  }

  async listExercises(search: string | null) {
    const rows = await this.prisma.brioExercise.findMany({
      where: {
        ownerUserId: null,
        ...(search ? { name: { contains: search } } : {}),
      },
      include: EXERCISE_INCLUDE,
      orderBy: [{ isArchived: 'asc' }, { name: 'asc' }],
    });
    return rows.map(toExercise);
  }

  async createExercise(input: SaveExerciseInput) {
    const { muscles, ...fields } = input;
    const row = await this.prisma.brioExercise.create({
      data: {
        ...fields,
        ownerUserId: null,
        muscles: { create: muscleRows(muscles) },
      },
      include: EXERCISE_INCLUDE,
    });
    return toExercise(row);
  }

  async updateExercise(id: string, input: SaveExerciseInput) {
    const found = await this.prisma.brioExercise.count({
      where: { id, ownerUserId: null },
    });
    if (!found) return null;
    const { muscles, ...fields } = input;
    await this.prisma.$transaction([
      this.prisma.brioExerciseMuscle.deleteMany({ where: { exerciseId: id } }),
      this.prisma.brioExercise.update({
        where: { id },
        data: { ...fields, muscles: { create: muscleRows(muscles) } },
      }),
    ]);
    const row = await this.prisma.brioExercise.findUniqueOrThrow({
      where: { id },
      include: EXERCISE_INCLUDE,
    });
    return toExercise(row);
  }

  async exerciseCodeTaken(code: string, exceptId: string | null) {
    const n = await this.prisma.brioExercise.count({
      where: { code, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    });
    return n > 0;
  }

  async listActivityTypes() {
    const rows = await this.prisma.brioActivityType.findMany({
      where: { ownerUserId: null },
      include: TYPE_INCLUDE,
      orderBy: [{ isArchived: 'asc' }, { name: 'asc' }],
    });
    return rows.map(toType);
  }

  async createActivityType(input: SaveActivityTypeInput) {
    const row = await this.prisma.brioActivityType.create({
      data: { ...input, ownerUserId: null },
      include: TYPE_INCLUDE,
    });
    return toType(row);
  }

  async updateActivityType(id: string, input: SaveActivityTypeInput) {
    const found = await this.prisma.brioActivityType.count({
      where: { id, ownerUserId: null },
    });
    if (!found) return null;
    const row = await this.prisma.brioActivityType.update({
      where: { id },
      data: input,
      include: TYPE_INCLUDE,
    });
    return toType(row);
  }

  async activityCodeTaken(code: string, exceptId: string | null) {
    const n = await this.prisma.brioActivityType.count({
      where: { code, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    });
    return n > 0;
  }
}
