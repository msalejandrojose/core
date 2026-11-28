import type { Meal, PlannedMeal } from '../../domain/services/menu';

export const BRIO_MENU_REPOSITORY = Symbol('BRIO_MENU_REPOSITORY');

export type NewPlannedMeal = Omit<PlannedMeal, 'id'>;

export interface BrioMenuRepositoryPort {
  /** Platos elegidos por el usuario entre dos días. */
  choicesBetween(
    userId: string,
    from: string,
    to: string,
  ): Promise<{ day: string; meal: Meal; dishCode: string }[]>;
  saveChoice(
    userId: string,
    day: string,
    meal: Meal,
    dishCode: string,
  ): Promise<void>;
  /** Códigos de producto ya comprados en la semana que empieza en `weekStart`. */
  checkedItems(userId: string, weekStart: string): Promise<string[]>;
  setChecked(
    userId: string,
    weekStart: string,
    itemCode: string,
    checked: boolean,
  ): Promise<void>;
  /** Comidas planificadas a mano entre dos días, en el orden en que se pusieron. */
  plannedBetween(
    userId: string,
    from: string,
    to: string,
  ): Promise<PlannedMeal[]>;
  addPlanned(userId: string, data: NewPlannedMeal): Promise<PlannedMeal>;
  /** Borra una; false si no existe o no es suya. */
  deletePlanned(userId: string, id: string): Promise<boolean>;
  /** Vacía una comida de un día (vuelve el plato sugerido). Devuelve cuántas quitó. */
  clearPlanned(userId: string, day: string, meal: Meal): Promise<number>;
}
