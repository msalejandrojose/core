import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BRIO_CATALOG_ADMIN,
  type BrioCatalogAdminPort,
  type SaveActivityTypeInput,
  type SaveExerciseInput,
  type SaveFoodInput,
} from '../ports/catalog-admin.port';

const MUSCLES = new Set([
  'CHEST',
  'LATS',
  'TRAPS',
  'FRONT_DELT',
  'SIDE_DELT',
  'REAR_DELT',
  'BICEPS',
  'TRICEPS',
  'FOREARMS',
  'QUADS',
  'HAMSTRINGS',
  'GLUTES',
  'CALVES',
  'ABS',
  'LOWER_BACK',
]);
const WEIGHTS = new Set([0.25, 0.5, 1]);

/** Reglas de los catálogos que no caben en un DTO. */
export function cleanFood(input: SaveFoodInput): SaveFoodInput {
  const name = input.name.trim();
  if (!name) throw new BadRequestException('BRIO_FOOD_NAME_REQUIRED');
  const macroKcal =
    input.proteinPer100G * 4 + input.carbsPer100G * 4 + input.fatPer100G * 9;
  // Los macros no pueden dar mucho más que las kcal (tolerancia de redondeos y fibra/alcohol).
  if (macroKcal > input.kcalPer100 * 1.35 + 20)
    throw new BadRequestException('BRIO_FOOD_MACROS_EXCEED_KCAL');
  const servings = input.servings
    .map((s) => ({ ...s, label: s.label.trim() }))
    .filter((s) => s.label && s.grams > 0);
  const labels = new Set(servings.map((s) => s.label.toLowerCase()));
  if (labels.size !== servings.length)
    throw new BadRequestException('BRIO_FOOD_SERVING_DUPLICATED');
  const unit = input.isLiquid ? 'ml' : 'g';
  const withBase = servings.length
    ? servings
    : [{ label: `100 ${unit}`, grams: 100, isDefault: true }];
  const defaults = withBase.filter((s) => s.isDefault).length;
  return {
    ...input,
    name,
    brand: input.brand?.trim() || null,
    barcode: input.barcode?.trim() || null,
    servings: withBase.map((s, i) => ({
      ...s,
      isDefault: defaults === 1 ? s.isDefault : i === 0,
    })),
  };
}

export function cleanExercise(input: SaveExerciseInput): SaveExerciseInput {
  const name = input.name.trim();
  if (!name) throw new BadRequestException('BRIO_EXERCISE_NAME_REQUIRED');
  const seen = new Set<string>();
  for (const m of input.muscles) {
    if (!MUSCLES.has(m.muscle) || !WEIGHTS.has(m.weight) || seen.has(m.muscle))
      throw new BadRequestException('BRIO_EXERCISE_MUSCLES_INVALID');
    seen.add(m.muscle);
  }
  if (!input.muscles.some((m) => m.weight === 1))
    throw new BadRequestException('BRIO_EXERCISE_PRIMARY_MUSCLE_REQUIRED');
  return {
    ...input,
    name,
    code: input.code?.trim().toLowerCase() || null,
  };
}

@Injectable()
export class CatalogAdminUseCases {
  constructor(
    @Inject(BRIO_CATALOG_ADMIN) private readonly repo: BrioCatalogAdminPort,
  ) {}

  listFoods(q: Parameters<BrioCatalogAdminPort['listFoods']>[0]) {
    return this.repo.listFoods(q);
  }

  async saveFood(input: SaveFoodInput, id?: string) {
    const data = cleanFood(input);
    if (
      data.barcode &&
      (await this.repo.barcodeTaken(data.barcode, id ?? null))
    )
      throw new ConflictException('BRIO_FOOD_BARCODE_TAKEN');
    if (!id) return this.repo.createFood(data);
    const updated = await this.repo.updateFood(id, data);
    if (!updated) throw new NotFoundException('BRIO_FOOD_NOT_FOUND');
    return updated;
  }

  async deleteFood(id: string) {
    // Lo ya apuntado guarda su copia de nombre y kcal: borrar no rompe el historial.
    if (!(await this.repo.deleteFood(id)))
      throw new NotFoundException('BRIO_FOOD_NOT_FOUND');
  }

  listExercises(search: string | null) {
    return this.repo.listExercises(search);
  }

  async saveExercise(input: SaveExerciseInput, id?: string) {
    const data = cleanExercise(input);
    if (data.code && (await this.repo.exerciseCodeTaken(data.code, id ?? null)))
      throw new ConflictException('BRIO_EXERCISE_CODE_TAKEN');
    if (!id) return this.repo.createExercise(data);
    const updated = await this.repo.updateExercise(id, data);
    if (!updated) throw new NotFoundException('BRIO_EXERCISE_NOT_FOUND');
    return updated;
  }

  listActivityTypes() {
    return this.repo.listActivityTypes();
  }

  async saveActivityType(input: SaveActivityTypeInput, id?: string) {
    const data = {
      ...input,
      name: input.name.trim(),
      code: input.code?.trim().toLowerCase() || null,
      icon: input.icon?.trim() || null,
    };
    if (!data.name)
      throw new BadRequestException('BRIO_ACTIVITY_NAME_REQUIRED');
    if (data.code && (await this.repo.activityCodeTaken(data.code, id ?? null)))
      throw new ConflictException('BRIO_ACTIVITY_CODE_TAKEN');
    if (!id) return this.repo.createActivityType(data);
    const updated = await this.repo.updateActivityType(id, data);
    if (!updated) throw new NotFoundException('BRIO_ACTIVITY_TYPE_NOT_FOUND');
    return updated;
  }
}
