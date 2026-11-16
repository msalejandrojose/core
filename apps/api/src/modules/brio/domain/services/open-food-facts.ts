/**
 * Producto de Open Food Facts (base de datos abierta de alimentos envasados)
 * traducido a un alimento de Brío. Puro: valida y redondea lo que llega, que
 * a veces viene incompleto o con unidades raras.
 */

export interface OffProduct {
  product_name?: string;
  product_name_es?: string;
  generic_name_es?: string;
  brands?: string;
  quantity?: string;
  serving_size?: string;
  serving_quantity?: number | string;
  nutriments?: Record<string, number | string | undefined>;
}

export interface OffFood {
  name: string;
  brand: string | null;
  isLiquid: boolean;
  kcalPer100: number;
  proteinPer100G: number;
  carbsPer100G: number;
  fatPer100G: number;
  fiberPer100G: number | null;
  sugarPer100G: number | null;
  saturatedPer100G: number | null;
  sodiumPer100Mg: number | null;
  servings: { label: string; grams: number; isDefault: boolean }[];
}

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** «330 ml», «1 L», «500 g» → ¿es líquido? */
const liquidUnit = (s: string | undefined) =>
  !!s && /\d\s*(ml|cl|l)\b/i.test(s);

/** Ración del envase («30 g», «1 lata (330 ml)») en gramos o ml; null si no se entiende. */
export function servingGrams(p: OffProduct): number | null {
  const q = num(p.serving_quantity);
  if (q && q > 0 && q <= 2000) return Math.round(q);
  const m = p.serving_size
    ? /(\d+(?:[.,]\d+)?)\s*(g|ml|cl)\b/i.exec(p.serving_size)
    : null;
  if (!m) return null;
  const v =
    Number(m[1].replace(',', '.')) * (m[2].toLowerCase() === 'cl' ? 10 : 1);
  return v > 0 && v <= 2000 ? Math.round(v) : null;
}

/**
 * Alimento a partir del producto; null si no trae lo mínimo (nombre y kcal por
 * 100 g). Si faltan los macros se toman como 0: mejor un alimento con kcal
 * que nada.
 */
export function foodFromOff(p: OffProduct): OffFood | null {
  const name = (
    p.product_name_es ||
    p.product_name ||
    p.generic_name_es ||
    ''
  ).trim();
  const n = p.nutriments ?? {};
  let kcal = num(n['energy-kcal_100g']);
  // Algunos productos solo traen kJ.
  if (kcal === null) {
    const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g']);
    if (kj !== null) kcal = kj / 4.184;
  }
  if (!name || kcal === null || kcal > 950) return null;

  const isLiquid = liquidUnit(p.quantity) || liquidUnit(p.serving_size);
  const grams = servingGrams(p);
  const unit = isLiquid ? 'ml' : 'g';
  const sodiumG =
    num(n['sodium_100g']) ??
    (num(n['salt_100g']) !== null ? num(n['salt_100g'])! / 2.5 : null);

  return {
    name: name.slice(0, 200),
    brand: p.brands?.split(',')[0]?.trim().slice(0, 120) || null,
    isLiquid,
    kcalPer100: Math.round(kcal),
    proteinPer100G: round2(num(n['proteins_100g']) ?? 0),
    carbsPer100G: round2(num(n['carbohydrates_100g']) ?? 0),
    fatPer100G: round2(num(n['fat_100g']) ?? 0),
    fiberPer100G:
      num(n['fiber_100g']) !== null ? round2(num(n['fiber_100g'])!) : null,
    sugarPer100G:
      num(n['sugars_100g']) !== null ? round2(num(n['sugars_100g'])!) : null,
    saturatedPer100G:
      num(n['saturated-fat_100g']) !== null
        ? round2(num(n['saturated-fat_100g'])!)
        : null,
    sodiumPer100Mg: sodiumG !== null ? round2(sodiumG * 1000) : null,
    servings: [
      ...(grams
        ? [{ label: `1 ración (${grams} ${unit})`, grams, isDefault: true }]
        : []),
      { label: `100 ${unit}`, grams: 100, isDefault: !grams },
    ],
  };
}

/** EAN-8/13, UPC-A/E: solo dígitos, de 6 a 14. */
export const isBarcode = (code: string) => /^\d{6,14}$/.test(code);
