import type { MealEntry, MealType } from '../entities/meal-entry.entity';

/** Lo que se puede cambiar de una entrada ya registrada. */
export interface MealEntryPatch {
  mealType?: MealType;
  /** Nueva cantidad en g/ml. */
  quantityG?: number;
  /** Solo para registros rápidos (sin alimento del catálogo). */
  name?: string;
  kcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}

export type MealEntryValues = Pick<
  MealEntry,
  'mealType' | 'name' | 'quantityG' | 'kcal' | 'proteinG' | 'carbsG' | 'fatG'
>;

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Valores nuevos de una entrada al editarla, sin red ni base de datos.
 *
 * - Del catálogo: el nombre no se toca y, si cambia la cantidad, kcal y macros
 *   se escalan desde lo guardado (la entrada es un snapshot: no se vuelve a
 *   leer el alimento, que pudo cambiar después).
 * - Registro rápido: se cambian a mano nombre, kcal y macros.
 */
export function editMealEntry(
  entry: MealEntry,
  patch: MealEntryPatch,
): MealEntryValues {
  const mealType = patch.mealType ?? entry.mealType;

  if (entry.foodId) {
    const quantityG = patch.quantityG ?? entry.quantityG;
    const f = entry.quantityG > 0 ? quantityG / entry.quantityG : 1;
    return {
      mealType,
      name: entry.name,
      quantityG,
      kcal: Math.round(entry.kcal * f),
      proteinG: round1(entry.proteinG * f),
      carbsG: round1(entry.carbsG * f),
      fatG: round1(entry.fatG * f),
    };
  }

  return {
    mealType,
    name: patch.name?.trim() || entry.name,
    quantityG: patch.quantityG ?? entry.quantityG,
    kcal: Math.round(patch.kcal ?? entry.kcal),
    proteinG: patch.proteinG ?? entry.proteinG,
    carbsG: patch.carbsG ?? entry.carbsG,
    fatG: patch.fatG ?? entry.fatG,
  };
}
