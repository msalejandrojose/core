import { recipeNutrition } from './recipe';

const arroz = {
  kcalPer100: 130,
  proteinPer100G: 2.7,
  carbsPer100G: 28,
  fatPer100G: 0.3,
};
const pollo = {
  kcalPer100: 165,
  proteinPer100G: 31,
  carbsPer100G: 0,
  fatPer100G: 3.6,
};

describe('recipeNutrition', () => {
  it('reparte kcal y macros entre el peso total y las raciones', () => {
    const r = recipeNutrition(
      [
        { ...arroz, grams: 300 },
        { ...pollo, grams: 200 },
      ],
      2,
    );
    expect(r.totalGrams).toBe(500);
    expect(r.servingGrams).toBe(250);
    // (390 + 330) kcal / 500 g → 144 kcal por 100 g
    expect(r.kcalPer100).toBe(144);
    expect(r.perServing.kcal).toBe(360);
    expect(r.perServing.proteinG).toBe(35.1);
  });

  it('ignora ingredientes sin gramos y exige al menos uno', () => {
    expect(
      recipeNutrition(
        [
          { ...arroz, grams: 100 },
          { ...pollo, grams: 0 },
        ],
        1,
      ).kcalPer100,
    ).toBe(130);
    expect(() => recipeNutrition([{ ...arroz, grams: 0 }], 1)).toThrow(
      'RECIPE_WITHOUT_INGREDIENTS',
    );
  });

  it('como mínimo una ración', () => {
    expect(recipeNutrition([{ ...arroz, grams: 200 }], 0).servingGrams).toBe(
      200,
    );
  });
});
