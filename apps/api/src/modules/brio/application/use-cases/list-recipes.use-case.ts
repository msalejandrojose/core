import { Inject, Injectable } from '@nestjs/common';
import type { Food } from '../../domain/entities/food.entity';
import {
  BRIO_FOOD_REPOSITORY,
  type BrioFoodRepositoryPort,
} from '../ports/brio-food-repository.port';
import { RECIPE_SERVING_LABEL } from './create-recipe.use-case';

/** Las recetas que guardó el usuario (alimentos propios con «1 ración»). */
@Injectable()
export class ListRecipesUseCase {
  constructor(
    @Inject(BRIO_FOOD_REPOSITORY)
    private readonly foods: BrioFoodRepositoryPort,
  ) {}

  execute(userId: string): Promise<Food[]> {
    return this.foods.findOwnRecipes(userId, RECIPE_SERVING_LABEL);
  }
}
