import type { HabitItem, MealHabits, MealType } from '../api';

export interface Suggestion {
  mealType: MealType;
  items: HabitItem[];
  kcal: number;
  count: number;
}

/** "Lo de siempre" de una comida, o su alimento más frecuente si no hay combinación. */
export function suggestionFor(
  mealType: MealType,
  habits: MealHabits | undefined,
): Suggestion | null {
  if (!habits) return null;
  const combo = habits.combos[0];
  if (combo)
    return {
      mealType,
      items: combo.items,
      kcal: combo.kcal,
      count: combo.count,
    };
  const top = habits.frequent[0];
  if (top && top.count >= 2)
    return {
      mealType,
      items: [top],
      kcal: Math.round(top.kcal),
      count: top.count,
    };
  return null;
}
