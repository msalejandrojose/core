/* eslint-disable @typescript-eslint/require-await -- dobles de prueba: métodos async sin await */
import {
  defaultDish,
  nextDish,
  type Meal,
  type PlannedMeal,
} from '../../domain/services/menu';
import type { Food } from '../../domain/entities/food.entity';
import {
  AddPlannedMealUseCase,
  CheckShoppingItemUseCase,
  ClearPlannedMealUseCase,
  GetMenuWeekUseCase,
  GetShoppingListUseCase,
  LogPlannedMealUseCase,
  RemovePlannedMealUseCase,
  SwapMenuDishUseCase,
} from './menu.use-cases';

const USER = 'u1';
const LENTEJAS = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PAN = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const food = (
  id: string,
  name: string,
  kcalPer100: number,
  servings: Food['servings'],
): Food => ({
  id,
  name,
  brand: null,
  barcode: null,
  source: 'USER',
  ownerUserId: USER,
  isVerified: false,
  isLiquid: false,
  kcalPer100,
  proteinPer100G: 9,
  carbsPer100G: 20,
  fatPer100G: 3,
  servings,
});
const FOODS = [
  food(LENTEJAS, 'Lentejas de mi madre', 150, [
    { id: 's-racion', label: '1 ración', grams: 400, isDefault: true },
  ]),
  food(PAN, 'Pan', 250, []),
];
const DAYS = [
  '2026-11-09',
  '2026-11-10',
  '2026-11-11',
  '2026-11-12',
  '2026-11-13',
  '2026-11-14',
  '2026-11-15',
];

function setup(withDiet = true) {
  const choices: { day: string; meal: Meal; dishCode: string }[] = [];
  const checked = new Set<string>();
  let planned: PlannedMeal[] = [];
  let seq = 0;
  const repo = {
    plannedBetween: async (_u: string, from: string, to: string) =>
      planned.filter((p) => p.day >= from && p.day <= to),
    addPlanned: async (_u: string, data: Omit<PlannedMeal, 'id'>) => {
      const p = { ...data, id: `p${++seq}` };
      planned.push(p);
      return p;
    },
    deletePlanned: async (_u: string, id: string) => {
      const before = planned.length;
      planned = planned.filter((p) => p.id !== id);
      return planned.length < before;
    },
    clearPlanned: async (_u: string, day: string, meal: Meal) => {
      const before = planned.length;
      planned = planned.filter((p) => !(p.day === day && p.meal === meal));
      return before - planned.length;
    },
    choicesBetween: async (_u: string, from: string, to: string) =>
      choices.filter((c) => c.day >= from && c.day <= to),
    saveChoice: async (
      _u: string,
      day: string,
      meal: Meal,
      dishCode: string,
    ) => {
      const i = choices.findIndex((c) => c.day === day && c.meal === meal);
      if (i >= 0) choices.splice(i, 1);
      choices.push({ day, meal, dishCode });
    },
    checkedItems: async () => [...checked],
    setChecked: async (_u: string, _w: string, code: string, on: boolean) => {
      if (on) checked.add(code);
      else checked.delete(code);
    },
  };
  const planWeek = {
    execute: async () => ({
      from: DAYS[0],
      to: DAYS[6],
      today: '2026-11-13',
      diet: withDiet
        ? DAYS.map((day, i) => ({
            day,
            load: i === 4 ? 'HIGH' : 'MEDIUM',
            kcalTarget: i === 4 ? 2900 : 2500,
          }))
        : null,
    }),
  };
  const foods = {
    findVisibleTo: async (id: string) => FOODS.find((f) => f.id === id) ?? null,
  };
  const logged: Record<string, unknown>[] = [];
  const logMeal = {
    execute: async (input: Record<string, unknown>) => {
      logged.push(input);
      return { id: `e${logged.length}`, name: 'x', kcal: 0 };
    },
  };
  const menuWeek = new GetMenuWeekUseCase(repo, planWeek as never);
  const shopping = new GetShoppingListUseCase(repo, menuWeek);
  return {
    menuWeek,
    shopping,
    logged,
    swap: new SwapMenuDishUseCase(repo, menuWeek),
    check: new CheckShoppingItemUseCase(repo, shopping),
    add: new AddPlannedMealUseCase(repo, foods as never),
    remove: new RemovePlannedMealUseCase(repo),
    clear: new ClearPlannedMealUseCase(repo),
    log: new LogPlannedMealUseCase(menuWeek, logMeal as never),
  };
}

describe('menú de la semana', () => {
  it('da un menú por día ajustado a sus calorías', async () => {
    const { menuWeek } = setup();
    const week = await menuWeek.execute(USER);
    expect(week.days).toHaveLength(7);
    const friday = week.days![4];
    expect(friday).toMatchObject({
      day: '2026-11-13',
      load: 'HIGH',
      kcalTarget: 2900,
    });
    expect(Math.abs(friday.totals.kcal - 2900)).toBeLessThan(2900 * 0.06);
    expect(friday.totals.kcal).toBeGreaterThan(week.days![0].totals.kcal);
  });

  it('sin objetivo de calorías no inventa un menú', async () => {
    const { menuWeek, shopping } = setup(false);
    expect((await menuWeek.execute(USER)).days).toBeNull();
    expect(await shopping.execute(USER)).toMatchObject({
      sections: [],
      total: 0,
      done: 0,
    });
  });

  it('cambiar un plato pasa al siguiente y se recuerda', async () => {
    const { swap, menuWeek } = setup();
    const first = defaultDish('2026-11-13', 'LUNCH');
    const once = await swap.execute(USER, '2026-11-13', 'LUNCH');
    expect(once.days![4].meals[1].dishCode).toBe(nextDish(first).code);
    const twice = await swap.execute(USER, '2026-11-13', 'LUNCH');
    expect(twice.days![4].meals[1].dishCode).toBe(
      nextDish(nextDish(first)).code,
    );
    expect((await menuWeek.execute(USER)).days![4].meals[1].dishCode).toBe(
      nextDish(nextDish(first)).code,
    );
    // El resto de comidas y días no cambia.
    expect(twice.days![3].meals[1].dishCode).toBe(
      defaultDish('2026-11-12', 'LUNCH').code,
    );
  });
});

describe('lista de la compra', () => {
  it('sale del menú y recuerda lo comprado', async () => {
    const { shopping, check } = setup();
    const list = await shopping.execute(USER);
    expect(list.total).toBeGreaterThan(15);
    expect(list.done).toBe(0);
    const code = list.sections[0].items[0].code;
    const after = await check.execute(USER, undefined, code, true);
    expect(after.done).toBe(1);
    expect(after.sections[0].items[0].checked).toBe(true);
    expect((await check.execute(USER, undefined, code, false)).done).toBe(0);
  });

  it('rechaza un producto que no existe', async () => {
    const { check } = setup();
    await expect(
      check.execute(USER, undefined, 'caviar', true),
    ).rejects.toThrow('BRIO_SHOPPING_ITEM_UNKNOWN');
  });
});

describe('comidas planificadas a mano', () => {
  const FRI = '2026-11-13';

  it('una receta sustituye al plato sugerido y suma sus kcal', async () => {
    const { add, menuWeek } = setup();
    await add.execute(USER, { day: FRI, meal: 'LUNCH', foodId: LENTEJAS });
    const lunch = (await menuWeek.execute(USER)).days![4].meals[1];
    expect(lunch).toMatchObject({
      source: 'PLANNED',
      dishCode: null,
      name: 'Lentejas de mi madre',
      kcal: 600,
      ingredients: [],
    });
    expect(lunch.items[0]).toMatchObject({
      servingLabel: '1 ración',
      quantity: 1,
      quantityG: 400,
      amount: '1 ración',
    });
    // El resto del día sigue con los platos sugeridos.
    expect((await menuWeek.execute(USER)).days![4].meals[0].source).toBe(
      'SUGGESTED',
    );
  });

  it('suma varias cosas en la misma comida, con gramos o sin catálogo', async () => {
    const { add, menuWeek } = setup();
    await add.execute(USER, {
      day: FRI,
      meal: 'DINNER',
      foodId: PAN,
      quantity: 80,
    });
    await add.execute(USER, {
      day: FRI,
      meal: 'DINNER',
      customName: 'Tortilla del bar',
      kcal: 350,
    });
    const dinner = (await menuWeek.execute(USER)).days![4].meals[3];
    expect(dinner.name).toBe('Pan + Tortilla del bar');
    expect(dinner.kcal).toBe(200 + 350);
    expect(dinner.items.map((i) => i.amount)).toEqual(['80 g', '0 g']);
  });

  it('valida comida, día, cantidad y alimento', async () => {
    const { add } = setup();
    await expect(
      add.execute(USER, { day: FRI, meal: 'BRUNCH', foodId: PAN }),
    ).rejects.toThrow('BRIO_MENU_MEAL_INVALID');
    await expect(
      add.execute(USER, { day: '13/11/2026', meal: 'LUNCH', foodId: PAN }),
    ).rejects.toThrow('BRIO_MENU_DAY_INVALID');
    await expect(
      add.execute(USER, {
        day: FRI,
        meal: 'LUNCH',
        foodId: LENTEJAS,
        servingId: 's-racion',
        quantity: 50,
      }),
    ).rejects.toThrow('BRIO_MENU_QUANTITY_INVALID');
    await expect(
      add.execute(USER, {
        day: FRI,
        meal: 'LUNCH',
        foodId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      }),
    ).rejects.toMatchObject({ code: 'BRIO_FOOD_NOT_FOUND' });
    await expect(
      add.execute(USER, { day: FRI, meal: 'LUNCH', customName: 'Algo' }),
    ).rejects.toThrow('BRIO_MENU_ITEM_INVALID');
  });

  it('quitar una cosa o vaciar la comida devuelve el plato sugerido', async () => {
    const { add, remove, clear, menuWeek } = setup();
    const a = await add.execute(USER, {
      day: FRI,
      meal: 'LUNCH',
      foodId: LENTEJAS,
    });
    await add.execute(USER, {
      day: FRI,
      meal: 'LUNCH',
      foodId: PAN,
      quantity: 60,
    });
    await remove.execute(USER, a.id);
    expect((await menuWeek.execute(USER)).days![4].meals[1].name).toBe('Pan');
    await expect(remove.execute(USER, a.id)).rejects.toThrow(
      'BRIO_PLANNED_MEAL_NOT_FOUND',
    );
    expect(await clear.execute(USER, FRI, 'LUNCH')).toBe(1);
    const lunch = (await menuWeek.execute(USER)).days![4].meals[1];
    expect(lunch.source).toBe('SUGGESTED');
    expect(lunch.dishCode).toBe(defaultDish(FRI, 'LUNCH').code);
  });

  it('la compra lleva lo planificado entero en «Otros» y se puede marcar', async () => {
    const { add, shopping, check } = setup();
    await add.execute(USER, { day: FRI, meal: 'LUNCH', foodId: LENTEJAS });
    await add.execute(USER, {
      day: '2026-11-14',
      meal: 'LUNCH',
      foodId: LENTEJAS,
      servingId: 's-racion',
      quantity: 2,
    });
    await add.execute(USER, {
      day: FRI,
      meal: 'SNACK',
      customName: 'Café',
      kcal: 5,
    });
    const list = await shopping.execute(USER);
    const other = list.sections.find((s) => s.aisle === 'OTHER');
    expect(other?.items).toEqual([
      expect.objectContaining({
        code: `food:${LENTEJAS}`,
        name: 'Lentejas de mi madre',
        quantity: '3 × 1 ración',
      }),
    ]);
    const after = await check.execute(
      USER,
      undefined,
      `food:${LENTEJAS}`,
      true,
    );
    expect(
      after.sections.find((s) => s.aisle === 'OTHER')?.items[0].checked,
    ).toBe(true);
  });

  it('apuntar la comida del menú lleva al diario lo planificado o el plato sugerido', async () => {
    const { add, log, logged } = setup();
    await add.execute(USER, {
      day: FRI,
      meal: 'LUNCH',
      foodId: LENTEJAS,
      servingId: 's-racion',
      quantity: 1.5,
    });
    await add.execute(USER, {
      day: FRI,
      meal: 'LUNCH',
      customName: 'Postre',
      kcal: 150,
    });
    expect(await log.execute(USER, FRI, 'LUNCH')).toHaveLength(2);
    expect(logged[0]).toMatchObject({
      loggedOn: FRI,
      mealType: 'LUNCH',
      foodId: LENTEJAS,
      servingId: 's-racion',
      quantity: 1.5,
    });
    expect(logged[1]).toMatchObject({ customName: 'Postre', kcal: 150 });

    await log.execute(USER, FRI, 'BREAKFAST');
    expect(logged[2]).toMatchObject({
      mealType: 'BREAKFAST',
      customName: defaultDish(FRI, 'BREAKFAST').name,
    });
  });
});
