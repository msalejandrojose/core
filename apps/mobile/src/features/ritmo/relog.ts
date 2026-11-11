import { ritmoApi, type LogMealBody, type MealEntry, type MealType } from './api';

/** Lo mínimo para volver a registrar algo: hábito, entrada de otro día… */
export interface RelogItem {
  foodId: string | null;
  name: string;
  quantityG: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Cuerpo para registrar de nuevo un alimento con su cantidad. Del catálogo se
 * manda `foodId` + gramos y la API recalcula kcal y macros (el cliente nunca
 * calcula calorías); el texto libre lleva sus valores tal cual.
 */
export function relogBody(item: RelogItem, mealType: MealType, loggedOn?: string): LogMealBody {
  return item.foodId
    ? { mealType, loggedOn, foodId: item.foodId, quantity: item.quantityG }
    : {
        mealType,
        loggedOn,
        customName: item.name,
        quantity: 1,
        kcal: item.kcal,
        proteinG: item.proteinG,
        carbsG: item.carbsG,
        fatG: item.fatG,
      };
}

/**
 * Registra varios alimentos de una vez ("lo de siempre", una comida copiada).
 * En serie y no en paralelo: el diario se recalcula tras cada escritura y así
 * no compiten. Si uno falla, deshace los ya creados para no dejar media comida.
 */
export async function logItems(
  items: RelogItem[],
  mealType: MealType,
  loggedOn?: string,
): Promise<MealEntry[]> {
  const created: MealEntry[] = [];
  try {
    for (const item of items) {
      created.push(await ritmoApi.logMeal(relogBody(item, mealType, loggedOn)));
    }
    return created;
  } catch (e) {
    await deleteEntries(created.map((c) => c.id));
    throw e;
  }
}

/** Borra entradas (el "Deshacer" de un registro de varios alimentos). */
export async function deleteEntries(ids: string[]): Promise<void> {
  for (const id of ids) {
    await ritmoApi.deleteMeal(id).catch(() => undefined);
  }
}
