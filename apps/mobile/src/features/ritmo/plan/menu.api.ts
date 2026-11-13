import { call } from '../api';
import type { PlanLoad } from './plan.api';

/** Contrato de `/ritmo/plan/menu` y `/ritmo/plan/shopping`. */

export type Meal = 'BREAKFAST' | 'LUNCH' | 'SNACK' | 'DINNER';
export type Aisle = 'PRODUCE' | 'PROTEIN' | 'DAIRY' | 'PANTRY';

export interface MenuMeal {
  meal: Meal;
  dishCode: string;
  name: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  ingredients: { code: string; name: string; grams: number; amount: string }[];
}

export interface MenuDay {
  day: string;
  load: PlanLoad;
  kcalTarget: number;
  meals: MenuMeal[];
  totals: { kcal: number; proteinG: number; carbsG: number; fatG: number };
}

export interface MenuWeek {
  from: string;
  to: string;
  today: string;
  days: MenuDay[] | null;
}

export interface ShoppingView {
  from: string;
  to: string;
  sections: { aisle: Aisle; items: { code: string; name: string; quantity: string; checked: boolean }[] }[];
  total: number;
  done: number;
}

export const menuApi = {
  week: () => call<MenuWeek>('GET', '/ritmo/plan/menu'),
  swap: (day: string, meal: Meal) => call<MenuWeek>('POST', `/ritmo/plan/menu/${day}/${meal}/swap`),
  shopping: () => call<ShoppingView>('GET', '/ritmo/plan/shopping'),
  check: (code: string, checked: boolean) => call<ShoppingView>('PUT', `/ritmo/plan/shopping/${code}`, { body: { checked } }),
};

export const MEAL_LABEL: Record<Meal, string> = { BREAKFAST: 'Desayuno', LUNCH: 'Comida', SNACK: 'Merienda', DINNER: 'Cena' };
export const AISLE_LABEL: Record<Aisle, string> = {
  PRODUCE: 'Fruta y verdura',
  PROTEIN: 'Carne, pescado y huevos',
  DAIRY: 'Lácteos',
  PANTRY: 'Despensa',
};

/** La lista como texto, para compartirla por cualquier app. */
export function shoppingText(list: ShoppingView): string {
  const lines = list.sections.flatMap((s) => [`${AISLE_LABEL[s.aisle]}:`, ...s.items.map((i) => `${i.checked ? '✓' : '·'} ${i.name} — ${i.quantity}`), '']);
  return ['Lista de la compra', '', ...lines].join('\n').trim();
}
