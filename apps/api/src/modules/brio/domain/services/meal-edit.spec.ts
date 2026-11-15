import type { MealEntry } from '../entities/meal-entry.entity';
import { editMealEntry } from './meal-edit';

const CATALOG: MealEntry = {
  id: 'm1',
  userId: 'u1',
  loggedOn: '2026-11-13',
  mealType: 'BREAKFAST',
  foodId: 'f1',
  servingId: null,
  name: 'Avena',
  quantityG: 50,
  kcal: 190,
  proteinG: 6.5,
  carbsG: 33,
  fatG: 3.5,
};

const QUICK: MealEntry = {
  ...CATALOG,
  foodId: null,
  name: 'Menú del día',
  quantityG: 1,
  kcal: 700,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
};

describe('editMealEntry', () => {
  it('escala kcal y macros del catálogo con la nueva cantidad', () => {
    expect(editMealEntry(CATALOG, { quantityG: 75 })).toEqual({
      mealType: 'BREAKFAST',
      name: 'Avena',
      quantityG: 75,
      kcal: 285,
      proteinG: 9.8,
      carbsG: 49.5,
      fatG: 5.3,
    });
  });

  it('en el catálogo no deja cambiar el nombre ni las kcal a mano', () => {
    const out = editMealEntry(CATALOG, { name: 'Otra', kcal: 1 });
    expect(out.name).toBe('Avena');
    expect(out.kcal).toBe(190);
  });

  it('cambia de momento del día sin tocar lo demás', () => {
    const out = editMealEntry(CATALOG, { mealType: 'SNACK' });
    expect(out).toMatchObject({ mealType: 'SNACK', quantityG: 50, kcal: 190 });
  });

  it('en un registro rápido se cambian nombre y kcal a mano', () => {
    expect(
      editMealEntry(QUICK, { name: '  Bocadillo ', kcal: 512.4 }),
    ).toMatchObject({
      name: 'Bocadillo',
      kcal: 512,
    });
  });

  it('un nombre vacío deja el que había', () => {
    expect(editMealEntry(QUICK, { name: '   ' }).name).toBe('Menú del día');
  });
});
