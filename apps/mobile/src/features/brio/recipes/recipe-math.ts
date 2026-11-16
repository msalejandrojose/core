import type { Food } from '../api';

/** Un ingrediente de la receta: el alimento del catálogo y sus gramos. */
export interface RecipeLine {
  food: Pick<Food, 'id' | 'name' | 'kcalPer100' | 'proteinPer100G' | 'carbsPer100G' | 'fatPer100G'>;
  grams: number;
}

export interface PerServing {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

/**
 * Lo que tiene una ración: la suma de cada ingrediente en sus gramos, entre
 * las raciones. Es la misma cuenta que hace la API al guardar
 * (`domain/services/recipe.ts`), así que lo que se ve es lo que se guarda.
 */
export function perServing(lines: readonly RecipeLine[], servings: number): PerServing {
  const portions = Math.max(1, Math.round(servings));
  const sum = (k: 'kcalPer100' | 'proteinPer100G' | 'carbsPer100G' | 'fatPer100G') =>
    lines.reduce((a, l) => a + (l.grams > 0 ? (l.food[k] * l.grams) / 100 : 0), 0);
  return {
    kcal: Math.round(sum('kcalPer100') / portions),
    proteinG: Math.round(sum('proteinPer100G') / portions),
    carbsG: Math.round(sum('carbsPer100G') / portions),
    fatG: Math.round(sum('fatPer100G') / portions),
  };
}

/** Gramos con los que entra un ingrediente: su ración por defecto o 100 g. */
export function defaultGrams(food: Pick<Food, 'servings'>): number {
  const serving = food.servings.find((s) => s.isDefault) ?? food.servings[0];
  return serving ? Math.round(serving.grams) : 100;
}

/** «1 ración · 380 g · 500 kcal» para la lista de recetas. */
export function recipeMeta(food: Pick<Food, 'kcalPer100' | 'servings'>): string {
  const grams = defaultGrams(food);
  return `1 ración · ${grams} g · ${Math.round((food.kcalPer100 * grams) / 100)} kcal`;
}
