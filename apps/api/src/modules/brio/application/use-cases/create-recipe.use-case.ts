import { Inject, Injectable } from '@nestjs/common';
import type { Food } from '../../domain/entities/food.entity';
import { BrioFoodNotFoundError } from '../../domain/errors/brio-food-not-found.error';
import {
  recipeNutrition,
  type RecipeNutrition,
} from '../../domain/services/recipe';
import {
  BRIO_FOOD_REPOSITORY,
  type BrioFoodRepositoryPort,
} from '../ports/brio-food-repository.port';

export interface CreateRecipeInput {
  userId: string;
  name: string;
  servings: number;
  ingredients: { foodId: string; grams: number }[];
}

/**
 * Guarda una receta como alimento propio (`source = USER`): sus valores por
 * 100 g salen de los ingredientes y su ración por defecto es «1 ración».
 * Después se apunta como cualquier otro alimento.
 */
@Injectable()
export class CreateRecipeUseCase {
  constructor(
    @Inject(BRIO_FOOD_REPOSITORY)
    private readonly foods: BrioFoodRepositoryPort,
  ) {}

  async execute(
    input: CreateRecipeInput,
  ): Promise<{ food: Food; nutrition: RecipeNutrition }> {
    const ingredients = await Promise.all(
      input.ingredients.map(async (i) => {
        const food = await this.foods.findVisibleTo(i.foodId, input.userId);
        if (!food) throw new BrioFoodNotFoundError(i.foodId);
        return { ...food, grams: i.grams };
      }),
    );
    const nutrition = recipeNutrition(ingredients, input.servings);
    const food = await this.foods.create({
      ownerUserId: input.userId,
      name: input.name.trim().slice(0, 200),
      brand: null,
      barcode: null,
      isLiquid: false,
      kcalPer100: nutrition.kcalPer100,
      proteinPer100G: nutrition.proteinPer100G,
      carbsPer100G: nutrition.carbsPer100G,
      fatPer100G: nutrition.fatPer100G,
      servings: [
        { label: '1 ración', grams: nutrition.servingGrams, isDefault: true },
      ],
    });
    return { food, nutrition };
  }
}
