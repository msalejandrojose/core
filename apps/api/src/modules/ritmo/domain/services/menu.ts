/**
 * Menús del plan: platos sencillos descritos por sus ingredientes, que se
 * escalan para cuadrar con las calorías de cada día, y la lista de la compra
 * que sale de sumarlos. Todo es aritmética: no hay recetas generadas.
 *
 * Los valores nutricionales son aproximados (por 100 g, en crudo o tal como se
 * compra) y sirven para orientar las cantidades, no como tabla nutricional.
 */

export type Meal = 'BREAKFAST' | 'LUNCH' | 'SNACK' | 'DINNER';
export const MEALS: readonly Meal[] = ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER'];

export type Aisle = 'PRODUCE' | 'PROTEIN' | 'DAIRY' | 'PANTRY';
export const AISLES: readonly Aisle[] = [
  'PRODUCE',
  'PROTEIN',
  'DAIRY',
  'PANTRY',
];

interface Item {
  name: string;
  aisle: Aisle;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Si se compra por unidades: gramos de una y cómo se llama ("ud", "lata"). */
  unit?: { grams: number; one: string; many: string };
  /** Se mide en mililitros (1 g ≈ 1 ml). */
  liquid?: boolean;
}

const UD = (grams: number) => ({ grams, one: 'ud', many: 'uds' });

export const ITEMS: Record<string, Item> = {
  platano: {
    name: 'Plátanos',
    aisle: 'PRODUCE',
    kcal: 89,
    protein: 1.1,
    carbs: 23,
    fat: 0.3,
    unit: UD(120),
  },
  manzana: {
    name: 'Manzanas',
    aisle: 'PRODUCE',
    kcal: 52,
    protein: 0.3,
    carbs: 14,
    fat: 0.2,
    unit: UD(180),
  },
  tomate: {
    name: 'Tomates',
    aisle: 'PRODUCE',
    kcal: 18,
    protein: 0.9,
    carbs: 3.9,
    fat: 0.2,
  },
  lechuga: {
    name: 'Lechuga',
    aisle: 'PRODUCE',
    kcal: 15,
    protein: 1.4,
    carbs: 2.9,
    fat: 0.2,
  },
  aguacate: {
    name: 'Aguacates',
    aisle: 'PRODUCE',
    kcal: 160,
    protein: 2,
    carbs: 9,
    fat: 15,
    unit: UD(150),
  },
  frutos_rojos: {
    name: 'Frutos rojos',
    aisle: 'PRODUCE',
    kcal: 45,
    protein: 0.8,
    carbs: 10,
    fat: 0.4,
  },
  espinacas: {
    name: 'Espinacas',
    aisle: 'PRODUCE',
    kcal: 23,
    protein: 2.9,
    carbs: 3.6,
    fat: 0.4,
  },
  verduras: {
    name: 'Verduras para asar',
    aisle: 'PRODUCE',
    kcal: 25,
    protein: 1.2,
    carbs: 5,
    fat: 0.3,
  },
  patata: {
    name: 'Patatas',
    aisle: 'PRODUCE',
    kcal: 77,
    protein: 2,
    carbs: 17,
    fat: 0.1,
  },
  pollo: {
    name: 'Pechuga de pollo',
    aisle: 'PROTEIN',
    kcal: 120,
    protein: 23,
    carbs: 0,
    fat: 2.6,
  },
  salmon: {
    name: 'Salmón',
    aisle: 'PROTEIN',
    kcal: 208,
    protein: 20,
    carbs: 0,
    fat: 13,
  },
  merluza: {
    name: 'Merluza',
    aisle: 'PROTEIN',
    kcal: 86,
    protein: 17,
    carbs: 0,
    fat: 1.8,
  },
  huevos: {
    name: 'Huevos',
    aisle: 'PROTEIN',
    kcal: 143,
    protein: 13,
    carbs: 0.7,
    fat: 9.5,
    unit: UD(60),
  },
  pavo: {
    name: 'Pechuga de pavo',
    aisle: 'PROTEIN',
    kcal: 105,
    protein: 22,
    carbs: 1,
    fat: 1.5,
  },
  atun: {
    name: 'Atún al natural',
    aisle: 'PROTEIN',
    kcal: 116,
    protein: 26,
    carbs: 0,
    fat: 1,
    unit: { grams: 80, one: 'lata', many: 'latas' },
  },
  yogur: {
    name: 'Yogur griego',
    aisle: 'DAIRY',
    kcal: 97,
    protein: 9,
    carbs: 4,
    fat: 5,
    unit: UD(125),
  },
  leche: {
    name: 'Leche semidesnatada',
    aisle: 'DAIRY',
    kcal: 46,
    protein: 3.3,
    carbs: 4.8,
    fat: 1.6,
    liquid: true,
  },
  queso_fresco: {
    name: 'Queso fresco',
    aisle: 'DAIRY',
    kcal: 98,
    protein: 11,
    carbs: 3.5,
    fat: 4.5,
  },
  avena: {
    name: 'Copos de avena',
    aisle: 'PANTRY',
    kcal: 379,
    protein: 13,
    carbs: 60,
    fat: 7,
  },
  arroz: {
    name: 'Arroz',
    aisle: 'PANTRY',
    kcal: 360,
    protein: 7,
    carbs: 79,
    fat: 0.6,
  },
  pasta: {
    name: 'Pasta',
    aisle: 'PANTRY',
    kcal: 359,
    protein: 13,
    carbs: 71,
    fat: 1.5,
  },
  lentejas: {
    name: 'Lentejas pardinas',
    aisle: 'PANTRY',
    kcal: 352,
    protein: 25,
    carbs: 60,
    fat: 1,
  },
  garbanzos: {
    name: 'Garbanzos cocidos',
    aisle: 'PANTRY',
    kcal: 139,
    protein: 8,
    carbs: 20,
    fat: 2.5,
  },
  pan: {
    name: 'Pan integral',
    aisle: 'PANTRY',
    kcal: 250,
    protein: 9,
    carbs: 45,
    fat: 3.5,
  },
  nueces: {
    name: 'Nueces',
    aisle: 'PANTRY',
    kcal: 654,
    protein: 15,
    carbs: 14,
    fat: 65,
  },
  almendras: {
    name: 'Almendras',
    aisle: 'PANTRY',
    kcal: 579,
    protein: 21,
    carbs: 22,
    fat: 50,
  },
  miel: {
    name: 'Miel',
    aisle: 'PANTRY',
    kcal: 304,
    protein: 0.3,
    carbs: 82,
    fat: 0,
  },
  aceite: {
    name: 'Aceite de oliva',
    aisle: 'PANTRY',
    kcal: 884,
    protein: 0,
    carbs: 0,
    fat: 100,
    liquid: true,
  },
  granola: {
    name: 'Granola',
    aisle: 'PANTRY',
    kcal: 450,
    protein: 10,
    carbs: 65,
    fat: 15,
  },
  tomate_triturado: {
    name: 'Tomate triturado',
    aisle: 'PANTRY',
    kcal: 32,
    protein: 1.5,
    carbs: 6,
    fat: 0.2,
  },
};

export interface Dish {
  code: string;
  name: string;
  meal: Meal;
  /** Gramos de cada ingrediente en la ración de referencia. */
  ingredients: Record<string, number>;
}

const dish = (
  meal: Meal,
  code: string,
  name: string,
  ingredients: Record<string, number>,
): Dish => ({ code, name, meal, ingredients });

export const DISHES: readonly Dish[] = [
  dish('BREAKFAST', 'avena_platano', 'Avena con plátano y nueces', {
    avena: 70,
    leche: 250,
    platano: 120,
    nueces: 15,
  }),
  dish('BREAKFAST', 'tostadas_aguacate', 'Tostadas con aguacate y huevos', {
    pan: 80,
    aguacate: 75,
    huevos: 120,
    tomate: 80,
  }),
  dish('BREAKFAST', 'yogur_granola', 'Yogur griego, granola y frutos rojos', {
    yogur: 250,
    granola: 50,
    frutos_rojos: 100,
    miel: 10,
  }),
  dish('BREAKFAST', 'tostadas_pavo', 'Tostadas con tomate y pavo, y fruta', {
    pan: 100,
    tomate: 100,
    pavo: 60,
    aceite: 10,
    manzana: 180,
  }),
  dish('BREAKFAST', 'tortitas_avena', 'Tortitas de avena con plátano y yogur', {
    huevos: 120,
    avena: 50,
    platano: 120,
    yogur: 125,
  }),

  dish('LUNCH', 'arroz_pollo', 'Arroz con pollo y verduras', {
    arroz: 90,
    pollo: 150,
    verduras: 150,
    aceite: 10,
  }),
  dish('LUNCH', 'lentejas', 'Lentejas con verduras', {
    lentejas: 90,
    verduras: 150,
    patata: 100,
    aceite: 10,
    pan: 40,
  }),
  dish('LUNCH', 'pasta_atun', 'Pasta con atún y tomate', {
    pasta: 100,
    atun: 80,
    tomate_triturado: 150,
    aceite: 10,
  }),
  dish('LUNCH', 'garbanzos_espinacas', 'Garbanzos con espinacas y huevo', {
    garbanzos: 300,
    espinacas: 150,
    huevos: 60,
    aceite: 10,
    pan: 40,
  }),
  dish('LUNCH', 'pollo_patata', 'Pollo al horno con patata', {
    pollo: 180,
    patata: 300,
    verduras: 150,
    aceite: 10,
  }),

  dish('SNACK', 'yogur_nueces', 'Yogur griego y nueces', {
    yogur: 125,
    nueces: 20,
  }),
  dish('SNACK', 'fruta_almendras', 'Manzana y almendras', {
    manzana: 180,
    almendras: 25,
  }),
  dish('SNACK', 'tostada_pavo', 'Tostada con pavo y tomate', {
    pan: 50,
    pavo: 40,
    tomate: 50,
  }),
  dish('SNACK', 'platano_yogur', 'Plátano y yogur griego', {
    platano: 120,
    yogur: 125,
  }),

  dish('DINNER', 'salmon_arroz', 'Salmón con arroz y ensalada', {
    salmon: 150,
    arroz: 60,
    lechuga: 100,
    tomate: 100,
    aceite: 10,
  }),
  dish('DINNER', 'merluza_patata', 'Merluza con patata y verduras', {
    merluza: 200,
    patata: 250,
    verduras: 150,
    aceite: 10,
  }),
  dish('DINNER', 'tortilla_patata', 'Tortilla de patata y ensalada', {
    huevos: 180,
    patata: 250,
    aceite: 15,
    lechuga: 100,
    tomate: 100,
  }),
  dish('DINNER', 'pavo_arroz', 'Pavo con arroz y verduras', {
    pavo: 150,
    arroz: 60,
    verduras: 200,
    aceite: 10,
  }),
  dish('DINNER', 'ensalada_garbanzos', 'Ensalada de garbanzos y atún', {
    garbanzos: 200,
    atun: 80,
    tomate: 150,
    lechuga: 100,
    aceite: 10,
    queso_fresco: 80,
  }),
];

export const dishesFor = (meal: Meal) => DISHES.filter((d) => d.meal === meal);
export const dishByCode = (code: string) => DISHES.find((d) => d.code === code);

/** Parte de las calorías del día que se lleva cada comida. */
export const MEAL_SHARE: Record<Meal, number> = {
  BREAKFAST: 0.25,
  LUNCH: 0.35,
  SNACK: 0.1,
  DINNER: 0.3,
};

/** Límites de cuánto se agranda o encoge una ración antes de dejar de ser razonable. */
const MIN_SCALE = 0.6;
const MAX_SCALE = 1.8;

export interface Macros {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export function macrosOf(ingredients: Record<string, number>): Macros {
  let kcal = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  for (const [code, grams] of Object.entries(ingredients)) {
    const item = ITEMS[code];
    if (!item) continue;
    kcal += (item.kcal * grams) / 100;
    protein += (item.protein * grams) / 100;
    carbs += (item.carbs * grams) / 100;
    fat += (item.fat * grams) / 100;
  }
  return {
    kcal: Math.round(kcal),
    proteinG: Math.round(protein),
    carbsG: Math.round(carbs),
    fatG: Math.round(fat),
  };
}

/** Redondea a múltiplos de 5 g, sin dejar ningún ingrediente a cero. */
const round5 = (grams: number) => Math.max(5, Math.round(grams / 5) * 5);

/** Ingredientes del plato escalados para acercarse a `kcalTarget`. */
export function scaleDish(d: Dish, kcalTarget: number): Record<string, number> {
  const base = macrosOf(d.ingredients).kcal;
  const scale = Math.min(
    MAX_SCALE,
    Math.max(MIN_SCALE, base ? kcalTarget / base : 1),
  );
  return Object.fromEntries(
    Object.entries(d.ingredients).map(([code, grams]) => [
      code,
      round5(grams * scale),
    ]),
  );
}

/** Cantidad de un ingrediente tal como se lee en una receta: "150 g", "2 uds", "250 ml". */
export function amountLabel(code: string, grams: number): string {
  const item = ITEMS[code];
  if (item?.unit) {
    const n = Math.max(0.5, Math.round((grams / item.unit.grams) * 2) / 2);
    return `${String(n).replace('.', ',')} ${n === 1 ? item.unit.one : item.unit.many}`;
  }
  return `${grams} ${item?.liquid ? 'ml' : 'g'}`;
}

/** Días desde una fecha fija: hace que la rotación de platos avance cada día. */
const dayIndex = (day: string) =>
  Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);

/**
 * Plato que toca en una comida de un día si el usuario no ha elegido otro.
 * Cada comida rota a su ritmo para que no coincidan siempre las mismas parejas.
 */
export function defaultDish(day: string, meal: Meal): Dish {
  const options = dishesFor(meal);
  const offset = MEALS.indexOf(meal) * 2;
  return options[(dayIndex(day) + offset) % options.length];
}

/** El plato siguiente al actual dentro de su comida, para «cambiar». */
export function nextDish(current: Dish): Dish {
  const options = dishesFor(current.meal);
  return options[
    (options.findIndex((d) => d.code === current.code) + 1) % options.length
  ];
}

export interface MenuMeal extends Macros {
  meal: Meal;
  dishCode: string;
  name: string;
  ingredients: { code: string; name: string; grams: number; amount: string }[];
}

export interface MenuDay {
  day: string;
  kcalTarget: number;
  meals: MenuMeal[];
  totals: Macros;
}

/** Menú de un día: un plato por comida, escalado a su parte del objetivo. */
export function menuForDay(
  day: string,
  kcalTarget: number,
  chosen: Partial<Record<Meal, string>> = {},
): MenuDay {
  const meals = MEALS.map((meal): MenuMeal => {
    const picked = chosen[meal] ? dishByCode(chosen[meal]) : undefined;
    const d = picked && picked.meal === meal ? picked : defaultDish(day, meal);
    const scaled = scaleDish(d, kcalTarget * MEAL_SHARE[meal]);
    return {
      meal,
      dishCode: d.code,
      name: d.name,
      ...macrosOf(scaled),
      ingredients: Object.entries(scaled).map(([code, grams]) => ({
        code,
        name: ITEMS[code].name,
        grams,
        amount: amountLabel(code, grams),
      })),
    };
  });
  const sum = (pick: (m: MenuMeal) => number) =>
    meals.reduce((s, m) => s + pick(m), 0);
  return {
    day,
    kcalTarget,
    meals,
    totals: {
      kcal: sum((m) => m.kcal),
      proteinG: sum((m) => m.proteinG),
      carbsG: sum((m) => m.carbsG),
      fatG: sum((m) => m.fatG),
    },
  };
}

export interface ShoppingItem {
  code: string;
  name: string;
  grams: number;
  /** Cantidad a comprar, redondeada hacia arriba a algo que se vende. */
  quantity: string;
}

/** Cantidad de compra: unidades enteras, o gramos/ml redondeados hacia arriba. */
export function quantityLabel(code: string, grams: number): string {
  const item = ITEMS[code];
  if (item?.unit) {
    const n = Math.ceil(grams / item.unit.grams);
    return `${n} ${n === 1 ? item.unit.one : item.unit.many}`;
  }
  const rounded = Math.ceil(grams / 50) * 50;
  const [small, big] = item?.liquid ? ['ml', 'L'] : ['g', 'kg'];
  if (rounded < 1000) return `${rounded} ${small}`;
  return `${String(Math.ceil(rounded / 100) / 10).replace('.', ',')} ${big}`;
}

/** Lista de la compra de varios días de menú, agrupada por pasillo. */
export function shoppingList(
  days: MenuDay[],
): { aisle: Aisle; items: ShoppingItem[] }[] {
  const grams = new Map<string, number>();
  for (const d of days)
    for (const m of d.meals)
      for (const i of m.ingredients)
        grams.set(i.code, (grams.get(i.code) ?? 0) + i.grams);
  return AISLES.map((aisle) => ({
    aisle,
    items: [...grams.entries()]
      .filter(([code]) => ITEMS[code].aisle === aisle)
      .map(([code, g]) => ({
        code,
        name: ITEMS[code].name,
        grams: g,
        quantity: quantityLabel(code, g),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es')),
  })).filter((section) => section.items.length > 0);
}
