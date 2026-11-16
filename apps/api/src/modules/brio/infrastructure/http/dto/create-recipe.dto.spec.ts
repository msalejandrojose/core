import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateRecipeDto } from './create-recipe.dto';

const ID = '3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e';
const errors = (body: unknown) =>
  validateSync(plainToInstance(CreateRecipeDto, body)).map((e) => e.property);

describe('CreateRecipeDto', () => {
  it('acepta nombre, raciones e ingredientes con gramos', () => {
    expect(
      errors({
        name: 'Lentejas',
        servings: 4,
        ingredients: [{ foodId: ID, grams: 320 }],
      }),
    ).toEqual([]);
  });

  it('rechaza recetas sin ingredientes, raciones raras o gramos a cero', () => {
    expect(
      errors({ name: 'Lentejas', servings: 4, ingredients: [] }),
    ).toContain('ingredients');
    expect(
      errors({
        name: 'Lentejas',
        servings: 0.5,
        ingredients: [{ foodId: ID, grams: 10 }],
      }),
    ).toContain('servings');
    expect(
      errors({
        name: 'Lentejas',
        servings: 2,
        ingredients: [{ foodId: ID, grams: 0 }],
      }),
    ).toContain('ingredients');
    expect(
      errors({
        name: 'L',
        servings: 2,
        ingredients: [{ foodId: 'x', grams: 10 }],
      }),
    ).toEqual(expect.arrayContaining(['name', 'ingredients']));
  });
});
