import type { MealEntry, MealType } from '../entities/meal-entry.entity';

/**
 * Hábitos de comida de una persona para un momento del día: lo que suele
 * comer junto ("lo de siempre"), lo que más repite y lo último que tomó.
 * Es lo que permite registrar con uno o dos toques en vez de buscar.
 *
 * Funciones puras sobre las entradas del diario: no hay tabla de hábitos que
 * mantener sincronizada, se recalcula del historial cada vez.
 */

/** Un alimento tal y como se volvería a registrar (su última cantidad). */
export interface HabitItem {
  /** Clave estable: el alimento del catálogo o, si es texto libre, el nombre. */
  key: string;
  foodId: string | null;
  name: string;
  quantityG: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  /** Veces que aparece en el periodo analizado. */
  count: number;
  /** Último día en que se tomó (`YYYY-MM-DD`). */
  lastOn: string;
}

export interface HabitCombo {
  items: HabitItem[];
  /** Comidas (día + momento) en las que se tomó exactamente esta combinación. */
  count: number;
  kcal: number;
}

export interface MealHabits {
  combos: HabitCombo[];
  frequent: HabitItem[];
  recent: HabitItem[];
}

export const MAX_COMBOS = 2;
export const MAX_FREQUENT = 8;
export const MAX_RECENT = 3;
/** Una combinación que solo se ha comido una vez no es "lo de siempre". */
export const MIN_COMBO_COUNT = 2;

function itemKey(entry: MealEntry): string {
  return entry.foodId ?? `text:${entry.name.trim().toLowerCase()}`;
}

/**
 * Calcula los hábitos de un momento del día. `entries` puede traer cualquier
 * momento y cualquier orden: se filtra y se ordena aquí.
 */
export function mealHabits(
  entries: MealEntry[],
  mealType: MealType,
): MealHabits {
  const own = entries
    .filter((e) => e.mealType === mealType)
    .sort((a, b) => a.loggedOn.localeCompare(b.loggedOn));

  // Último registro de cada alimento (su cantidad es la que se repetiría) y
  // cuántas veces aparece.
  const latest = new Map<string, MealEntry>();
  const counts = new Map<string, number>();
  for (const entry of own) {
    const key = itemKey(entry);
    latest.set(key, entry);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const toItem = (key: string): HabitItem => {
    const e = latest.get(key)!;
    return {
      key,
      foodId: e.foodId,
      name: e.name,
      quantityG: e.quantityG,
      kcal: e.kcal,
      proteinG: e.proteinG,
      carbsG: e.carbsG,
      fatG: e.fatG,
      count: counts.get(key) ?? 0,
      lastOn: e.loggedOn,
    };
  };

  // Frecuentes: más veces primero; a igualdad, lo más reciente.
  const frequent = [...latest.keys()]
    .map(toItem)
    .sort((a, b) => b.count - a.count || b.lastOn.localeCompare(a.lastOn))
    .slice(0, MAX_FREQUENT);

  // Recientes: alimentos distintos, del último día hacia atrás.
  const recent = [...latest.keys()]
    .map(toItem)
    .sort((a, b) => b.lastOn.localeCompare(a.lastOn))
    .slice(0, MAX_RECENT);

  // "Lo de siempre": el conjunto de alimentos de cada comida (un día y un
  // momento), contando las comidas que repiten exactamente el mismo conjunto.
  const meals = new Map<string, Set<string>>();
  for (const entry of own) {
    const set = meals.get(entry.loggedOn) ?? new Set<string>();
    set.add(itemKey(entry));
    meals.set(entry.loggedOn, set);
  }
  const comboCounts = new Map<
    string,
    { keys: string[]; count: number; lastOn: string }
  >();
  for (const [day, set] of meals) {
    if (set.size < 2) continue; // un solo alimento ya sale en frecuentes
    const keys = [...set].sort();
    const id = keys.join('|');
    const prev = comboCounts.get(id);
    comboCounts.set(id, {
      keys,
      count: (prev?.count ?? 0) + 1,
      lastOn: prev && prev.lastOn > day ? prev.lastOn : day,
    });
  }
  const combos = [...comboCounts.values()]
    .filter((c) => c.count >= MIN_COMBO_COUNT)
    .sort((a, b) => b.count - a.count || b.lastOn.localeCompare(a.lastOn))
    .slice(0, MAX_COMBOS)
    .map((c) => {
      const items = c.keys.map(toItem);
      return {
        items,
        count: c.count,
        kcal: Math.round(items.reduce((sum, i) => sum + i.kcal, 0)),
      };
    });

  return { combos, frequent, recent };
}
