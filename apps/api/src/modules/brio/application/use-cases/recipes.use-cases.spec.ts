/* eslint-disable @typescript-eslint/require-await -- dobles de prueba */
import { BrioFoodNotFoundError } from '../../domain/errors/brio-food-not-found.error';
import {
  CreateRecipeUseCase,
  RECIPE_SERVING_LABEL,
} from './create-recipe.use-case';
import { ListRecipesUseCase } from './list-recipes.use-case';

const LENTEJAS = {
  id: 'lentejas',
  kcalPer100: 350,
  proteinPer100G: 24,
  carbsPer100G: 50,
  fatPer100G: 1.5,
};
const ACEITE = {
  id: 'aceite',
  kcalPer100: 900,
  proteinPer100G: 0,
  carbsPer100G: 0,
  fatPer100G: 100,
};

function setup(visible: Record<string, unknown> = {}) {
  const foods = {
    findVisibleTo: jest.fn(async (id: string) => visible[id] ?? null),
    create: jest.fn(async (data: unknown) => ({
      id: 'receta',
      ...(data as object),
    })),
    findOwnRecipes: jest.fn(async () => [{ id: 'receta' }]),
  };
  return {
    foods,
    create: new CreateRecipeUseCase(foods as never),
    list: new ListRecipesUseCase(foods as never),
  };
}

describe('CreateRecipeUseCase', () => {
  it('guarda la receta como alimento propio con «1 ración»', async () => {
    const t = setup({ lentejas: LENTEJAS, aceite: ACEITE });
    const { nutrition } = await t.create.execute({
      userId: 'u1',
      name: '  Lentejas de la abuela ',
      servings: 4,
      ingredients: [
        { foodId: 'lentejas', grams: 380 },
        { foodId: 'aceite', grams: 20 },
      ],
    });
    // 380 g de lentejas (1330 kcal) + 20 g de aceite (180) = 1510 kcal en 400 g.
    expect(nutrition.perServing.kcal).toBe(378);
    expect(nutrition.servingGrams).toBe(100);
    expect(t.foods.findVisibleTo).toHaveBeenCalledWith('lentejas', 'u1');
    expect(t.foods.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerUserId: 'u1',
        name: 'Lentejas de la abuela',
        kcalPer100: 378,
        servings: [
          { label: RECIPE_SERVING_LABEL, grams: 100, isDefault: true },
        ],
      }),
    );
  });

  it('un ingrediente que no ve el usuario corta sin guardar nada', async () => {
    const t = setup({ lentejas: LENTEJAS });
    await expect(
      t.create.execute({
        userId: 'u1',
        name: 'Receta',
        servings: 2,
        ingredients: [
          { foodId: 'lentejas', grams: 100 },
          { foodId: 'ajeno', grams: 50 },
        ],
      }),
    ).rejects.toBeInstanceOf(BrioFoodNotFoundError);
    expect(t.foods.create).not.toHaveBeenCalled();
  });
});

describe('ListRecipesUseCase', () => {
  it('pide los alimentos propios con la etiqueta de receta', async () => {
    const t = setup();
    expect(await t.list.execute('u1')).toEqual([{ id: 'receta' }]);
    expect(t.foods.findOwnRecipes).toHaveBeenCalledWith(
      'u1',
      RECIPE_SERVING_LABEL,
    );
  });
});
