import type { RelogItem } from '../relog';

export interface TrayItem extends RelogItem {
  key: string;
}

/** Suma de kcal y macros de lo elegido. */
export function trayTotals(items: TrayItem[]) {
  return items.reduce(
    (t, i) => ({ kcal: t.kcal + i.kcal, protein: t.protein + i.proteinG, carbs: t.carbs + i.carbsG, fat: t.fat + i.fatG }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
