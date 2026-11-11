// Alimento del catálogo, siempre normalizado a 100 g (o 100 ml si `isLiquid`).
// `ownerUserId === null` = catálogo compartido; con valor = alimento privado.
export type FoodSource = 'CURATED' | 'OPEN_FOOD_FACTS' | 'USER';

/** Ración precalculada ("1 rebanada = 30 g"). */
export interface FoodServing {
  id: string;
  label: string;
  grams: number;
  isDefault: boolean;
}

export interface Food {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  source: FoodSource;
  ownerUserId: string | null;
  isVerified: boolean;
  isLiquid: boolean;
  kcalPer100: number;
  proteinPer100G: number;
  carbsPer100G: number;
  fatPer100G: number;
  servings: FoodServing[];
}

/** Valores de un alimento escalados a una cantidad concreta. */
export interface Macros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}
