import { describe, expect, it } from 'vitest';
import { defaultGrams, perServing, recipeMeta } from './recipe-math';

const food = (id: string, kcal: number, p: number, c: number, f: number) => ({
  id,
  name: id,
  kcalPer100: kcal,
  proteinPer100G: p,
  carbsPer100G: c,
  fatPer100G: f,
});

describe('perServing', () => {
  const lines = [
    { food: food('lentejas', 350, 24, 50, 1.5), grams: 380 },
    { food: food('aceite', 900, 0, 0, 100), grams: 20 },
  ];

  it('reparte la receta completa entre las raciones', () => {
    expect(perServing(lines, 4)).toEqual({ kcal: 378, proteinG: 23, carbsG: 48, fatG: 6 });
    expect(perServing(lines, 1).kcal).toBe(1510);
  });

  it('ignora gramos a cero y nunca divide entre menos de una ración', () => {
    expect(perServing([{ ...lines[0], grams: 0 }], 0)).toEqual({ kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 });
  });
});

describe('defaultGrams y recipeMeta', () => {
  it('usa la ración por defecto o 100 g', () => {
    expect(defaultGrams({ servings: [] })).toBe(100);
    expect(defaultGrams({ servings: [{ id: 's', label: '1 ración', grams: 412.4, isDefault: true }] })).toBe(412);
  });

  it('describe una receta guardada', () => {
    expect(
      recipeMeta({ kcalPer100: 120, servings: [{ id: 's', label: '1 ración', grams: 400, isDefault: true }] }),
    ).toBe('1 ración · 400 g · 480 kcal');
  });
});
