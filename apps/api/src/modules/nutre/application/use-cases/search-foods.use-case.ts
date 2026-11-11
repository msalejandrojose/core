import { Inject, Injectable } from '@nestjs/common';
import type { Food } from '../../domain/entities/food.entity';
import {
  NUTRE_FOOD_REPOSITORY,
  type NutreFoodRepositoryPort,
} from '../ports/nutre-food-repository.port';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

/**
 * Buscador de alimentos del registro de comida. Si llega un código de barras
 * (escáner de la app) se resuelve por código, que es exacto, en vez de tratarlo
 * como texto.
 */
@Injectable()
export class SearchFoodsUseCase {
  constructor(
    @Inject(NUTRE_FOOD_REPOSITORY)
    private readonly foods: NutreFoodRepositoryPort,
  ) {}

  async execute(input: {
    userId: string;
    query?: string;
    barcode?: string;
    limit?: number;
  }): Promise<Food[]> {
    if (input.barcode) {
      const found = await this.foods.findByBarcode(input.userId, input.barcode);
      return found ? [found] : [];
    }
    const query = (input.query ?? '').trim();
    if (query.length === 0) return [];
    return this.foods.search(
      input.userId,
      query,
      Math.min(input.limit ?? DEFAULT_LIMIT, MAX_LIMIT),
    );
  }
}
