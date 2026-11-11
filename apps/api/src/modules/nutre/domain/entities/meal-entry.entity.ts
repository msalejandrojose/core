// Una entrada del diario de comidas. Guarda kcal y macros como snapshot en vez
// de recalcularlos desde el catálogo: si el alimento se corrige o se borra, el
// diario de ayer no cambia.
//
// `customName` cubre el registro rápido sin catálogo ("menú del día, 700
// kcal"), que es justo lo que evita que la gente abandone la app.
import type { Macros } from './food.entity';

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';

export interface MealEntry extends Macros {
  id: string;
  userId: string;
  /** Día natural (`YYYY-MM-DD`). */
  loggedOn: string;
  mealType: MealType;
  foodId: string | null;
  servingId: string | null;
  /** Lo que se muestra en el diario: nombre del alimento o el texto libre. */
  name: string;
  quantityG: number;
}
