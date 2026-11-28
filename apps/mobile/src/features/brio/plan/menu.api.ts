import { call } from '../api';
import type { PlanLoad } from './plan.api';

/** Contrato de `/brio/plan/menu` y `/brio/plan/shopping`. */

export type Meal = 'BREAKFAST' | 'LUNCH' | 'SNACK' | 'DINNER';
export type Aisle = 'PRODUCE' | 'PROTEIN' | 'DAIRY' | 'PANTRY' | 'OTHER';

/** Algo que la persona puso a mano en una comida (alimento, receta o sin catálogo). */
export interface PlannedItem {
  id: string;
  day: string;
  meal: Meal;
  foodId: string | null;
  servingId: string | null;
  servingLabel: string | null;
  name: string;
  quantity: number;
  quantityG: number;
  /** "1 ración", "2 × 1 rebanada", "150 g". */
  amount: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface MenuMeal {
  meal: Meal;
  /** SUGGESTED = plato que propone Brío; PLANNED = lo que pusiste tú (`items`). Puede faltar en APIs viejas. */
  source?: 'SUGGESTED' | 'PLANNED';
  dishCode: string | null;
  name: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  ingredients: { code: string; name: string; grams: number; amount: string }[];
  items?: PlannedItem[];
}

export interface AddPlannedBody {
  foodId?: string;
  servingId?: string;
  quantity?: number;
  customName?: string;
  kcal?: number;
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
  week: () => call<MenuWeek>('GET', '/brio/plan/menu'),
  swap: (day: string, meal: Meal) => call<MenuWeek>('POST', `/brio/plan/menu/${day}/${meal}/swap`),
  /** Pone algo en una comida de un día; esa comida deja de usar el plato sugerido. */
  addItem: (day: string, meal: Meal, body: AddPlannedBody) => call<MenuWeek>('POST', `/brio/plan/menu/${day}/${meal}/items`, { body }),
  removeItem: (id: string, day: string) =>
    call<MenuWeek>('DELETE', `/brio/plan/menu/items/${id}`, { params: { query: { day } } }),
  /** Vacía la comida: vuelve el plato sugerido. */
  clearMeal: (day: string, meal: Meal) => call<MenuWeek>('DELETE', `/brio/plan/menu/${day}/${meal}/items`),
  /** Apunta en el diario lo que había en el menú para esa comida. */
  logMeal: (day: string, meal: Meal) => call<{ entries: unknown[] }>('POST', `/brio/plan/menu/${day}/${meal}/log`),
  shopping: () => call<ShoppingView>('GET', '/brio/plan/shopping'),
  check: (code: string, checked: boolean) => call<ShoppingView>('PUT', `/brio/plan/shopping/${code}`, { body: { checked } }),
};

export const MEAL_LABEL: Record<Meal, string> = { BREAKFAST: 'Desayuno', LUNCH: 'Comida', SNACK: 'Merienda', DINNER: 'Cena' };
export const AISLE_LABEL: Record<Aisle, string> = {
  PRODUCE: 'Fruta y verdura',
  PROTEIN: 'Carne, pescado y huevos',
  DAIRY: 'Lácteos',
  PANTRY: 'Despensa',
  OTHER: 'Tus platos y recetas',
};

/** La lista como texto, para compartirla por cualquier app. */
export function shoppingText(list: ShoppingView): string {
  const lines = list.sections.flatMap((s) => [`${AISLE_LABEL[s.aisle]}:`, ...s.items.map((i) => `${i.checked ? '✓' : '·'} ${i.name} — ${i.quantity}`), '']);
  return ['Lista de la compra', '', ...lines].join('\n').trim();
}
