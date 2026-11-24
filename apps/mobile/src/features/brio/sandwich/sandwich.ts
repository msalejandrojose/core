import type { Food, SandwichBase } from '../api';
import type { TrayItem } from '../sheets/FoodTray';

/** Un ingrediente elegido: el alimento y sus gramos. */
export interface SandwichLine {
  food: Food;
  grams: number;
}

/** Gramos de la ración por defecto de un alimento (o 30 g, lo típico en un bocata). */
export function defaultGramsOf(food: Food): number {
  const s = food.servings.find((x) => x.isDefault) ?? food.servings[0];
  return s ? Math.round(s.grams) : 30;
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
/** «Jamón cocido (york)» → «jamón cocido»: sin paréntesis para el nombre. */
const short = (name: string) => lower(name.replace(/\s*\([^)]*\)\s*/g, ' ').trim());

const PREFIX: Record<SandwichBase['kind'], string> = {
  bocata: 'Bocata de',
  tostada: 'Tostada con',
  sandwich: 'Sándwich de',
  wrap: 'Wrap de',
};

/** «Bocata de jamón serrano, tomate natural rallado y aceite…» → como mucho tres ingredientes. */
export function sandwichName(base: SandwichBase | null, lines: SandwichLine[]): string {
  if (!base) return '';
  const names = lines.map((l) => short(l.food.name));
  if (names.length === 0) return base.label;
  const shown = names.slice(0, 3);
  const list =
    names.length > 3
      ? `${shown.join(', ')} y más`
      : shown.length === 1
        ? shown[0]
        : `${shown.slice(0, -1).join(', ')} y ${shown[shown.length - 1]}`;
  return `${PREFIX[base.kind]} ${list}`.slice(0, 120);
}

/** Vista previa de una línea para la bandeja (las kcal de verdad las calcula la API). */
export function lineItem(food: Food, grams: number): TrayItem {
  const f = grams / 100;
  return {
    key: food.id,
    foodId: food.id,
    name: food.name,
    quantityG: grams,
    kcal: food.kcalPer100 * f,
    proteinG: food.proteinPer100G * f,
    carbsG: food.carbsPer100G * f,
    fatG: food.fatPer100G * f,
  };
}

/** Pan y cada ingrediente, en orden, para la bandeja o para registrarlos por separado. */
export function sandwichItems(base: SandwichBase | null, lines: SandwichLine[]): TrayItem[] {
  return [...(base ? [{ ...lineItem(base.food, base.grams), key: 'base' }] : []), ...lines.map((l) => lineItem(l.food, l.grams))];
}
