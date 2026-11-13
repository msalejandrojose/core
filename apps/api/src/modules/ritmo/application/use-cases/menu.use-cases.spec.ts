/* eslint-disable @typescript-eslint/require-await -- dobles de prueba: métodos async sin await */
import { defaultDish, nextDish, type Meal } from '../../domain/services/menu';
import {
  CheckShoppingItemUseCase,
  GetMenuWeekUseCase,
  GetShoppingListUseCase,
  SwapMenuDishUseCase,
} from './menu.use-cases';

const USER = 'u1';
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
  const repo = {
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
  const menuWeek = new GetMenuWeekUseCase(repo, planWeek as never);
  const shopping = new GetShoppingListUseCase(repo, menuWeek);
  return {
    menuWeek,
    shopping,
    swap: new SwapMenuDishUseCase(repo, menuWeek),
    check: new CheckShoppingItemUseCase(repo, shopping),
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
    ).rejects.toThrow('RITMO_SHOPPING_ITEM_UNKNOWN');
  });
});
