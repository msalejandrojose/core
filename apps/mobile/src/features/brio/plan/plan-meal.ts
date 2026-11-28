import type { Food } from '../api';
import type { Meal, MenuMeal } from './menu.api';

/** Cuánto se pone en el menú: raciones de una ración del alimento, o gramos sin ración. */
export interface PlanPortion {
  servingId: string | null;
  quantity: number;
}

const MEALS: readonly Meal[] = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'];
export const isPlanMeal = (v: string | undefined): v is Meal => !!v && (MEALS as readonly string[]).includes(v);

/** Gramos de la porción (0 si la ración ya no existe). */
export function portionGrams(food: Pick<Food, 'servings'>, p: PlanPortion): number {
  if (!p.servingId) return p.quantity;
  const s = food.servings.find((x) => x.id === p.servingId);
  return s ? s.grams * p.quantity : 0;
}

/** Kcal de la porción, como las calculará la API al guardarla. */
export function planMealKcal(food: Pick<Food, 'servings' | 'kcalPer100'>, p: PlanPortion): number {
  return Math.round((food.kcalPer100 * portionGrams(food, p)) / 100);
}

/** Raciones de media en media, entre ½ y 20. */
export function stepServings(current: number, dir: 1 | -1): number {
  const next = Math.round((current + dir * 0.5) * 2) / 2;
  return Math.min(20, Math.max(0.5, next));
}

/** La comida la puso la persona (no es el plato sugerido). */
export const isPlanned = (m: Pick<MenuMeal, 'source' | 'items'>) => m.source === 'PLANNED' && (m.items?.length ?? 0) > 0;
