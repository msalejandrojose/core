import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { PlanLoad } from '../../domain/entities/plan.entity';
import {
  ITEMS,
  MEALS,
  defaultDish,
  dishByCode,
  menuForDay,
  nextDish,
  shoppingList,
  type Aisle,
  type Meal,
  type MenuDay,
} from '../../domain/services/menu';
import {
  BRIO_MENU_REPOSITORY,
  type BrioMenuRepositoryPort,
} from '../ports/menu.port';
import { GetPlanWeekUseCase } from './plan.use-cases';

export interface MenuWeek {
  from: string;
  to: string;
  today: string;
  /** null si el perfil aún no tiene objetivo de calorías. */
  days: (MenuDay & { load: PlanLoad })[] | null;
}

export interface ShoppingView {
  from: string;
  to: string;
  sections: {
    aisle: Aisle;
    items: { code: string; name: string; quantity: string; checked: boolean }[];
  }[];
  total: number;
  done: number;
}

/** Menú de la semana: cada día cuadra con las calorías que le da el plan. */
@Injectable()
export class GetMenuWeekUseCase {
  constructor(
    @Inject(BRIO_MENU_REPOSITORY)
    private readonly menus: BrioMenuRepositoryPort,
    private readonly planWeek: GetPlanWeekUseCase,
  ) {}

  async execute(userId: string, day?: string): Promise<MenuWeek> {
    const week = await this.planWeek.execute(userId, day ?? null);
    if (!week.diet)
      return { from: week.from, to: week.to, today: week.today, days: null };
    const choices = await this.menus.choicesBetween(userId, week.from, week.to);
    return {
      from: week.from,
      to: week.to,
      today: week.today,
      days: week.diet.map((d) => {
        const chosen: Partial<Record<Meal, string>> = {};
        for (const c of choices)
          if (c.day === d.day) chosen[c.meal] = c.dishCode;
        return { ...menuForDay(d.day, d.kcalTarget, chosen), load: d.load };
      }),
    };
  }
}

/** Cambia el plato de una comida por el siguiente de sus opciones y lo recuerda. */
@Injectable()
export class SwapMenuDishUseCase {
  constructor(
    @Inject(BRIO_MENU_REPOSITORY)
    private readonly menus: BrioMenuRepositoryPort,
    private readonly menuWeek: GetMenuWeekUseCase,
  ) {}

  async execute(userId: string, day: string, meal: Meal): Promise<MenuWeek> {
    if (!MEALS.includes(meal))
      throw new BadRequestException('BRIO_MENU_MEAL_INVALID');
    const [current] = (
      await this.menus.choicesBetween(userId, day, day)
    ).filter((c) => c.meal === meal);
    const dish =
      (current && dishByCode(current.dishCode)) || defaultDish(day, meal);
    await this.menus.saveChoice(userId, day, meal, nextDish(dish).code);
    return this.menuWeek.execute(userId, day);
  }
}

/** Lista de la compra de la semana: los ingredientes de su menú, sumados. */
@Injectable()
export class GetShoppingListUseCase {
  constructor(
    @Inject(BRIO_MENU_REPOSITORY)
    private readonly menus: BrioMenuRepositoryPort,
    private readonly menuWeek: GetMenuWeekUseCase,
  ) {}

  async execute(userId: string, day?: string): Promise<ShoppingView> {
    const week = await this.menuWeek.execute(userId, day);
    const checked = new Set(await this.menus.checkedItems(userId, week.from));
    const sections = shoppingList(week.days ?? []).map((s) => ({
      aisle: s.aisle,
      items: s.items.map((i) => ({
        code: i.code,
        name: i.name,
        quantity: i.quantity,
        checked: checked.has(i.code),
      })),
    }));
    const items = sections.flatMap((s) => s.items);
    return {
      from: week.from,
      to: week.to,
      sections,
      total: items.length,
      done: items.filter((i) => i.checked).length,
    };
  }
}

/** Marca o desmarca un producto como comprado en la lista de una semana. */
@Injectable()
export class CheckShoppingItemUseCase {
  constructor(
    @Inject(BRIO_MENU_REPOSITORY)
    private readonly menus: BrioMenuRepositoryPort,
    private readonly shopping: GetShoppingListUseCase,
  ) {}

  async execute(
    userId: string,
    day: string | undefined,
    itemCode: string,
    checked: boolean,
  ): Promise<ShoppingView> {
    if (!ITEMS[itemCode])
      throw new BadRequestException('BRIO_SHOPPING_ITEM_UNKNOWN');
    const view = await this.shopping.execute(userId, day);
    await this.menus.setChecked(userId, view.from, itemCode, checked);
    return this.shopping.execute(userId, day);
  }
}
