import type { Meal } from '../../domain/services/menu';

export const BRIO_MENU_REPOSITORY = Symbol('BRIO_MENU_REPOSITORY');

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
}
