import { Inject, Injectable } from '@nestjs/common';
import type { Food } from '../../domain/entities/food.entity';
import {
  BRIO_FOOD_REPOSITORY,
  type CreateFoodData,
  type BrioFoodRepositoryPort,
} from '../ports/brio-food-repository.port';

/**
 * Alimento propio del usuario (lo que no está en el catálogo: su receta, el
 * plato de su madre). Nace con `source = USER` y `ownerUserId`, así que solo lo
 * ve él.
 */
@Injectable()
export class CreateFoodUseCase {
  constructor(
    @Inject(BRIO_FOOD_REPOSITORY)
    private readonly foods: BrioFoodRepositoryPort,
  ) {}

  execute(data: CreateFoodData): Promise<Food> {
    return this.foods.create(data);
  }
}
