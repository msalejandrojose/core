/**
 * Una receta es un alimento propio cuyo valor por 100 g sale de sus
 * ingredientes: se suman las kcal y macros de cada ingrediente en sus gramos y
 * se reparte entre el peso total. La ración es el peso total entre las
 * raciones que salen.
 */
export interface RecipeIngredient {
  grams: number;
  kcalPer100: number;
  proteinPer100G: number;
  carbsPer100G: number;
  fatPer100G: number;
}

export interface RecipeNutrition {
  totalGrams: number;
  servingGrams: number;
  kcalPer100: number;
  proteinPer100G: number;
  carbsPer100G: number;
  fatPer100G: number;
  /** Lo que tiene una ración, para contárselo a la persona. */
  perServing: { kcal: number; proteinG: number; carbsG: number; fatG: number };
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function recipeNutrition(
  ingredients: readonly RecipeIngredient[],
  servings: number,
): RecipeNutrition {
  const used = ingredients.filter((i) => i.grams > 0);
  if (used.length === 0) throw new Error('RECIPE_WITHOUT_INGREDIENTS');
  const portions = Math.max(1, Math.round(servings));
  const total = used.reduce((a, i) => a + i.grams, 0);
  const sum = (k: keyof Omit<RecipeIngredient, 'grams'>) =>
    used.reduce((a, i) => a + (i[k] * i.grams) / 100, 0);
  const kcal = sum('kcalPer100');
  const protein = sum('proteinPer100G');
  const carbs = sum('carbsPer100G');
  const fat = sum('fatPer100G');
  return {
    totalGrams: Math.round(total),
    servingGrams: Math.round(total / portions),
    kcalPer100: Math.round((kcal / total) * 100),
    proteinPer100G: r1((protein / total) * 100),
    carbsPer100G: r1((carbs / total) * 100),
    fatPer100G: r1((fat / total) * 100),
    perServing: {
      kcal: Math.round(kcal / portions),
      proteinG: r1(protein / portions),
      carbsG: r1(carbs / portions),
      fatG: r1(fat / portions),
    },
  };
}
