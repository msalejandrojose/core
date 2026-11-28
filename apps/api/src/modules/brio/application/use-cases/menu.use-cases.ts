import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MealEntry } from '../../domain/entities/meal-entry.entity';
import type { PlanLoad } from '../../domain/entities/plan.entity';
import { BrioFoodNotFoundError } from '../../domain/errors/brio-food-not-found.error';
import { scaleMacros } from '../../domain/services/energy';
import {
  ITEMS,
  MEALS,
  defaultDish,
  dishByCode,
  isPlannedItemCode,
  menuForDay,
  nextDish,
  shoppingList,
  type Aisle,
  type Meal,
  type MenuDay,
  type PlannedMeal,
} from '../../domain/services/menu';
import {
  BRIO_FOOD_REPOSITORY,
  type BrioFoodRepositoryPort,
} from '../ports/brio-food-repository.port';
import {
  BRIO_MENU_REPOSITORY,
  type BrioMenuRepositoryPort,
  type NewPlannedMeal,
} from '../ports/menu.port';
import { LogMealEntryUseCase } from './log-meal-entry.use-case';
import { GetPlanWeekUseCase } from './plan.use-cases';

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Cosas como mucho en una comida planificada: más es una lista, no un plato. */
export const MAX_PLANNED_PER_MEAL = 12;

function assertDay(day: string): void {
  if (!DAY_RE.test(day) || Number.isNaN(Date.parse(day)))
    throw new BadRequestException('BRIO_MENU_DAY_INVALID');
}
function assertMeal(meal: string): asserts meal is Meal {
  if (!MEALS.includes(meal as Meal))
    throw new BadRequestException('BRIO_MENU_MEAL_INVALID');
}

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
    const [choices, planned] = await Promise.all([
      this.menus.choicesBetween(userId, week.from, week.to),
      this.menus.plannedBetween(userId, week.from, week.to),
    ]);
    return {
      from: week.from,
      to: week.to,
      today: week.today,
      days: week.diet.map((d) => {
        const chosen: Partial<Record<Meal, string>> = {};
        for (const c of choices)
          if (c.day === d.day) chosen[c.meal] = c.dishCode;
        return {
          ...menuForDay(d.day, d.kcalTarget, chosen, planned),
          load: d.load,
        };
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

/** Lista de la compra de la semana: lo que la persona eligió para cada comida, sumado. */
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
    // Solo lo que la persona ha elegido: los platos sugeridos no se compran.
    const chosen = (week.days ?? []).map((d) => ({
      ...d,
      meals: d.meals.filter((m) => m.source === 'PLANNED'),
    }));
    const sections = shoppingList(chosen).map((s) => ({
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
    if (!ITEMS[itemCode] && !isPlannedItemCode(itemCode))
      throw new BadRequestException('BRIO_SHOPPING_ITEM_UNKNOWN');
    const view = await this.shopping.execute(userId, day);
    await this.menus.setChecked(userId, view.from, itemCode, checked);
    return this.shopping.execute(userId, day);
  }
}

export interface AddPlannedMealInput {
  day: string;
  meal: string;
  /** Alimento o receta del catálogo (de la persona o compartido). */
  foodId?: string;
  /** Ración del alimento; sin ella se usa la ración por defecto si no hay `quantity`. */
  servingId?: string;
  /** Raciones si hay ración; si no, gramos. */
  quantity?: number;
  /** Sin catálogo: nombre y kcal (y macros si se saben). */
  customName?: string;
  kcal?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}

/**
 * Pone un alimento, una receta o algo sin catálogo en una comida de un día del
 * menú. Esa comida deja de mostrar el plato sugerido y pasa a sumar lo puesto.
 */
@Injectable()
export class AddPlannedMealUseCase {
  constructor(
    @Inject(BRIO_MENU_REPOSITORY)
    private readonly menus: BrioMenuRepositoryPort,
    @Inject(BRIO_FOOD_REPOSITORY)
    private readonly foods: BrioFoodRepositoryPort,
  ) {}

  async execute(
    userId: string,
    input: AddPlannedMealInput,
  ): Promise<PlannedMeal> {
    assertDay(input.day);
    assertMeal(input.meal);
    const meal = input.meal;
    const already = (
      await this.menus.plannedBetween(userId, input.day, input.day)
    ).filter((p) => p.meal === meal);
    if (already.length >= MAX_PLANNED_PER_MEAL)
      throw new BadRequestException('BRIO_MENU_MEAL_FULL');
    const data = input.foodId
      ? await this.fromCatalog(userId, input, meal, input.foodId)
      : this.fromFreeText(input, meal);
    return this.menus.addPlanned(userId, data);
  }

  private async fromCatalog(
    userId: string,
    input: AddPlannedMealInput,
    meal: Meal,
    foodId: string,
  ): Promise<NewPlannedMeal> {
    const food = await this.foods.findVisibleTo(foodId, userId);
    if (!food) throw new BrioFoodNotFoundError(foodId);
    const serving = input.servingId
      ? food.servings.find((s) => s.id === input.servingId)
      : input.quantity === undefined
        ? (food.servings.find((s) => s.isDefault) ?? food.servings[0])
        : undefined;
    if (input.servingId && !serving)
      throw new BadRequestException('BRIO_SERVING_NOT_FOUND');
    const quantity = input.quantity ?? (serving ? 1 : 100);
    const valid = serving
      ? quantity >= 0.25 && quantity <= 20
      : quantity >= 1 && quantity <= 3000;
    if (!Number.isFinite(quantity) || !valid)
      throw new BadRequestException('BRIO_MENU_QUANTITY_INVALID');
    const quantityG = serving ? serving.grams * quantity : quantity;
    return {
      day: input.day,
      meal,
      foodId: food.id,
      servingId: serving?.id ?? null,
      servingLabel: serving?.label ?? null,
      name: food.brand ? `${food.name} (${food.brand})` : food.name,
      quantity,
      quantityG: Math.round(quantityG * 100) / 100,
      ...scaleMacros(food, quantityG),
    };
  }

  private fromFreeText(input: AddPlannedMealInput, meal: Meal): NewPlannedMeal {
    const name = input.customName?.trim();
    const kcal = input.kcal;
    if (
      !name ||
      kcal === undefined ||
      !Number.isFinite(kcal) ||
      kcal < 0 ||
      kcal > 5000
    )
      throw new BadRequestException('BRIO_MENU_ITEM_INVALID');
    const macro = (n: number | undefined) =>
      n !== undefined && Number.isFinite(n) && n >= 0 && n <= 500
        ? Math.round(n * 10) / 10
        : 0;
    return {
      day: input.day,
      meal,
      foodId: null,
      servingId: null,
      servingLabel: null,
      name,
      quantity: 1,
      quantityG: 0,
      kcal: Math.round(kcal),
      proteinG: macro(input.proteinG),
      carbsG: macro(input.carbsG),
      fatG: macro(input.fatG),
    };
  }
}

/** Quita una cosa planificada del menú. */
@Injectable()
export class RemovePlannedMealUseCase {
  constructor(
    @Inject(BRIO_MENU_REPOSITORY)
    private readonly menus: BrioMenuRepositoryPort,
  ) {}

  async execute(userId: string, id: string): Promise<void> {
    if (!(await this.menus.deletePlanned(userId, id)))
      throw new NotFoundException('BRIO_PLANNED_MEAL_NOT_FOUND');
  }
}

/** Vacía una comida de un día: vuelve el plato que sugiere Brío. */
@Injectable()
export class ClearPlannedMealUseCase {
  constructor(
    @Inject(BRIO_MENU_REPOSITORY)
    private readonly menus: BrioMenuRepositoryPort,
  ) {}

  async execute(userId: string, day: string, meal: string): Promise<number> {
    assertDay(day);
    assertMeal(meal);
    return this.menus.clearPlanned(userId, day, meal);
  }
}

/**
 * Apunta en el diario lo que había en el menú para una comida de un día: lo
 * planificado a mano, cosa por cosa, o el plato sugerido como una sola entrada.
 */
@Injectable()
export class LogPlannedMealUseCase {
  constructor(
    private readonly menuWeek: GetMenuWeekUseCase,
    private readonly logMeal: LogMealEntryUseCase,
  ) {}

  async execute(
    userId: string,
    day: string,
    meal: string,
  ): Promise<MealEntry[]> {
    assertDay(day);
    assertMeal(meal);
    const week = await this.menuWeek.execute(userId, day);
    const m = week.days
      ?.find((d) => d.day === day)
      ?.meals.find((x) => x.meal === meal);
    if (!m) throw new NotFoundException('BRIO_MENU_NOT_AVAILABLE');
    if (m.source === 'SUGGESTED') {
      return [
        await this.logMeal.execute({
          userId,
          loggedOn: day,
          mealType: meal,
          quantity: 1,
          customName: m.name,
          kcal: m.kcal,
          proteinG: m.proteinG,
          carbsG: m.carbsG,
          fatG: m.fatG,
        }),
      ];
    }
    const logged: MealEntry[] = [];
    for (const p of m.items) {
      logged.push(
        await this.logMeal.execute(
          p.foodId
            ? {
                userId,
                loggedOn: day,
                mealType: meal,
                foodId: p.foodId,
                servingId: p.servingId ?? undefined,
                quantity: p.servingId ? p.quantity : p.quantityG,
              }
            : {
                userId,
                loggedOn: day,
                mealType: meal,
                quantity: 1,
                customName: p.name,
                kcal: p.kcal,
                proteinG: p.proteinG,
                carbsG: p.carbsG,
                fatG: p.fatG,
              },
        ),
      );
    }
    return logged;
  }
}
