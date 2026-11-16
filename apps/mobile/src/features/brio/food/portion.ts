import type { RelogItem } from '../relog';

/**
 * Multiplicador de ración al añadir comida: «×1,3» o «×2» sobre la ración que
 * trae el alimento. Puro, para poder probarlo.
 */

export const MIN_FACTOR = 0.1;
export const MAX_FACTOR = 10;
/** Atajos que se ven como botones. */
export const QUICK_FACTORS = [0.5, 1, 1.5, 2] as const;

const round1 = (n: number) => Math.round(n * 10) / 10;

export function clampFactor(f: number): number {
  if (!Number.isFinite(f)) return 1;
  return Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, round1(f)));
}

/** Sube o baja en pasos de 0,1 (1 → 1,1 → … → 1,3). */
export const stepFactor = (f: number, dir: 1 | -1) => clampFactor(f + dir * 0.1);

/** El alimento con la cantidad y los valores multiplicados (lo que se manda a la API). */
export function scaleItem<T extends RelogItem>(item: T, factor: number): T {
  const f = clampFactor(factor);
  if (f === 1) return item;
  return {
    ...item,
    quantityG: Math.round(item.quantityG * f * 10) / 10,
    kcal: item.kcal * f,
    proteinG: item.proteinG * f,
    carbsG: item.carbsG * f,
    fatG: item.fatG * f,
  };
}

/** «×1,3», «×2», «½». */
export function factorLabel(f: number): string {
  if (f === 0.5) return '½';
  if (f === 1.5) return '1½';
  return `×${String(round1(f)).replace('.', ',')}`;
}
