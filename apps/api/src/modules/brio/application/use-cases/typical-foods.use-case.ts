import { Inject, Injectable } from '@nestjs/common';
import type { Food } from '../../domain/entities/food.entity';
import type { MealType } from '../../domain/entities/meal-entry.entity';
import { TYPICAL_BY_MEAL } from '../../domain/services/typical-foods';
import {
  BRIO_FOOD_REPOSITORY,
  type BrioFoodRepositoryPort,
} from '../ports/brio-food-repository.port';

/** Comidas típicas de un momento del día, para apuntar sin buscar. */
@Injectable()
export class TypicalFoodsUseCase {
  constructor(
    @Inject(BRIO_FOOD_REPOSITORY)
    private readonly foods: BrioFoodRepositoryPort,
  ) {}

  execute(mealType: MealType): Promise<Food[]> {
    return this.foods.findGlobalByNames(TYPICAL_BY_MEAL[mealType]);
  }
}
