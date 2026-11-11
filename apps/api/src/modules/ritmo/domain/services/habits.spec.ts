import type { MealEntry, MealType } from '../entities/meal-entry.entity';
import { MAX_FREQUENT, mealHabits } from './habits';

let seq = 0;
function entry(
  loggedOn: string,
  name: string,
  opts: {
    mealType?: MealType;
    foodId?: string | null;
    kcal?: number;
    quantityG?: number;
  } = {},
): MealEntry {
  seq += 1;
  return {
    id: `e${seq}`,
    userId: 'u1',
    loggedOn,
    mealType: opts.mealType ?? 'DINNER',
    foodId: opts.foodId === undefined ? `food-${name}` : opts.foodId,
    servingId: null,
    name,
    quantityG: opts.quantityG ?? 100,
    kcal: opts.kcal ?? 100,
    proteinG: 1,
    carbsG: 1,
    fatG: 1,
  };
}

describe('mealHabits', () => {
  it('detecta lo de siempre: la misma combinación en varias comidas', () => {
    const entries = [
      entry('2026-11-01', 'Tortilla', { kcal: 190 }),
      entry('2026-11-01', 'Ensalada', { kcal: 120 }),
      entry('2026-11-03', 'Tortilla', { kcal: 190 }),
      entry('2026-11-03', 'Ensalada', { kcal: 120 }),
      entry('2026-11-05', 'Salmón', { kcal: 310 }),
      entry('2026-11-05', 'Arroz', { kcal: 195 }),
    ];
    const { combos } = mealHabits(entries, 'DINNER');
    expect(combos).toHaveLength(1);
    expect(combos[0].count).toBe(2);
    expect(combos[0].kcal).toBe(310);
    expect(combos[0].items.map((i) => i.name).sort()).toEqual([
      'Ensalada',
      'Tortilla',
    ]);
  });

  it('solo mira el momento pedido', () => {
    const entries = [
      entry('2026-11-01', 'Café', { mealType: 'BREAKFAST' }),
      entry('2026-11-01', 'Tortilla'),
    ];
    const habits = mealHabits(entries, 'BREAKFAST');
    expect(habits.frequent.map((i) => i.name)).toEqual(['Café']);
  });

  it('ordena frecuentes por veces y repite la última cantidad', () => {
    const entries = [
      entry('2026-11-01', 'Arroz', { quantityG: 120 }),
      entry('2026-11-02', 'Arroz', { quantityG: 150 }),
      entry('2026-11-02', 'Pollo'),
    ];
    const { frequent } = mealHabits(entries, 'DINNER');
    expect(frequent[0]).toMatchObject({
      name: 'Arroz',
      count: 2,
      quantityG: 150,
      lastOn: '2026-11-02',
    });
    expect(frequent[1].name).toBe('Pollo');
  });

  it('trata el texto libre como un alimento por su nombre', () => {
    const entries = [
      entry('2026-11-01', 'Menú del día', { foodId: null }),
      entry('2026-11-02', 'menú del día ', { foodId: null }),
    ];
    const { frequent } = mealHabits(entries, 'DINNER');
    expect(frequent).toHaveLength(1);
    expect(frequent[0]).toMatchObject({ foodId: null, count: 2 });
  });

  it('recientes: alimentos distintos, lo último primero', () => {
    const entries = [
      entry('2026-11-01', 'Arroz'),
      entry('2026-11-04', 'Pollo'),
      entry('2026-11-03', 'Pan'),
      entry('2026-11-05', 'Arroz'),
    ];
    const { recent } = mealHabits(entries, 'DINNER');
    expect(recent.map((i) => i.name)).toEqual(['Arroz', 'Pollo', 'Pan']);
  });

  it('acota los frecuentes y no inventa combinaciones de una sola vez', () => {
    const entries = Array.from({ length: 12 }, (_, i) =>
      entry('2026-11-01', `Alimento ${i}`),
    );
    const habits = mealHabits(entries, 'DINNER');
    expect(habits.frequent).toHaveLength(MAX_FREQUENT);
    expect(habits.combos).toEqual([]);
  });

  it('sin historial devuelve todo vacío', () => {
    expect(mealHabits([], 'LUNCH')).toEqual({
      combos: [],
      frequent: [],
      recent: [],
    });
  });
});
