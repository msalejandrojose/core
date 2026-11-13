import {
  DISHES,
  ITEMS,
  MEALS,
  amountLabel,
  defaultDish,
  dishesFor,
  macrosOf,
  menuForDay,
  nextDish,
  quantityLabel,
  scaleDish,
  shoppingList,
} from './menu';

describe('catálogo de platos', () => {
  it('todos los ingredientes existen y cada comida tiene varias opciones', () => {
    for (const d of DISHES)
      for (const code of Object.keys(d.ingredients))
        expect(ITEMS[code]).toBeDefined();
    for (const meal of MEALS)
      expect(dishesFor(meal).length).toBeGreaterThanOrEqual(4);
    expect(new Set(DISHES.map((d) => d.code)).size).toBe(DISHES.length);
  });

  it('calcula las calorías de un plato desde sus ingredientes', () => {
    // 70 g avena (265) + 250 ml leche (115) + plátano (107) + 15 g nueces (98)
    expect(
      macrosOf({ avena: 70, leche: 250, platano: 120, nueces: 15 }).kcal,
    ).toBe(585);
  });
});

describe('menú del día', () => {
  it.each([1800, 2400, 3200])('se acerca al objetivo de %i kcal', (target) => {
    const menu = menuForDay('2026-11-13', target);
    expect(menu.meals.map((m) => m.meal)).toEqual(MEALS);
    expect(Math.abs(menu.totals.kcal - target) / target).toBeLessThan(0.06);
  });

  it('no deforma las raciones más allá de lo razonable', () => {
    const d = dishesFor('SNACK')[0];
    const base = macrosOf(d.ingredients).kcal;
    expect(macrosOf(scaleDish(d, 5000)).kcal).toBeLessThanOrEqual(base * 1.9);
    expect(macrosOf(scaleDish(d, 10)).kcal).toBeGreaterThanOrEqual(base * 0.5);
  });

  it('rota los platos de un día a otro y es estable para el mismo día', () => {
    expect(defaultDish('2026-11-13', 'LUNCH').code).toBe(
      defaultDish('2026-11-13', 'LUNCH').code,
    );
    expect(defaultDish('2026-11-13', 'LUNCH').code).not.toBe(
      defaultDish('2026-11-14', 'LUNCH').code,
    );
  });

  it('respeta el plato elegido, salvo que no sea de esa comida', () => {
    expect(
      menuForDay('2026-11-13', 2400, { LUNCH: 'lentejas' }).meals[1].dishCode,
    ).toBe('lentejas');
    const wrong = menuForDay('2026-11-13', 2400, { LUNCH: 'yogur_nueces' })
      .meals[1];
    expect(wrong.dishCode).toBe(defaultDish('2026-11-13', 'LUNCH').code);
  });

  it('«cambiar» recorre las opciones de la comida y vuelve a empezar', () => {
    const options = dishesFor('DINNER');
    expect(nextDish(options[0]).code).toBe(options[1].code);
    expect(nextDish(options[options.length - 1]).code).toBe(options[0].code);
  });
});

describe('cantidades', () => {
  it('lee las cantidades como en una receta', () => {
    expect(amountLabel('pollo', 150)).toBe('150 g');
    expect(amountLabel('leche', 250)).toBe('250 ml');
    expect(amountLabel('huevos', 120)).toBe('2 uds');
    expect(amountLabel('platano', 120)).toBe('1 ud');
    expect(amountLabel('aguacate', 75)).toBe('0,5 uds');
  });

  it('redondea la compra hacia arriba a algo que se vende', () => {
    expect(quantityLabel('huevos', 650)).toBe('11 uds');
    expect(quantityLabel('atun', 80)).toBe('1 lata');
    expect(quantityLabel('pollo', 910)).toBe('950 g');
    expect(quantityLabel('arroz', 1130)).toBe('1,2 kg');
    expect(quantityLabel('leche', 1750)).toBe('1,8 L');
  });

  it('suma los ingredientes de la semana por pasillo', () => {
    const days = ['2026-11-09', '2026-11-10'].map((d) => menuForDay(d, 2400));
    const list = shoppingList(days);
    expect(list.map((s) => s.aisle)).toEqual([
      'PRODUCE',
      'PROTEIN',
      'DAIRY',
      'PANTRY',
    ]);
    const oil = list
      .find((s) => s.aisle === 'PANTRY')!
      .items.find((i) => i.code === 'aceite')!;
    const expected = days
      .flatMap((d) => d.meals)
      .flatMap((m) => m.ingredients)
      .filter((i) => i.code === 'aceite')
      .reduce((s, i) => s + i.grams, 0);
    expect(oil.grams).toBe(expected);
    const names = list[0].items.map((i) => i.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')));
  });
});
