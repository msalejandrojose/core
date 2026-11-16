import { Inject, Injectable } from '@nestjs/common';
import type { Food } from '../../domain/entities/food.entity';
import {
  BRIO_FOOD_REPOSITORY,
  type BrioFoodRepositoryPort,
} from '../ports/brio-food-repository.port';
import {
  OPEN_FOOD_FACTS,
  type OpenFoodFactsPort,
} from '../ports/open-food-facts.port';
import { foodFromOff } from '../../domain/services/open-food-facts';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

/**
 * Buscador de alimentos del registro de comida. Si llega un código de barras
 * (escáner de la app) se resuelve por código, que es exacto, en vez de tratarlo
 * como texto; si no lo tenemos, se importa de Open Food Facts.
 */
@Injectable()
export class SearchFoodsUseCase {
  constructor(
    @Inject(BRIO_FOOD_REPOSITORY)
    private readonly foods: BrioFoodRepositoryPort,
    @Inject(OPEN_FOOD_FACTS) private readonly off: OpenFoodFactsPort,
  ) {}

  async execute(input: {
    userId: string;
    query?: string;
    barcode?: string;
    limit?: number;
  }): Promise<Food[]> {
    if (input.barcode) {
      const found = await this.foods.findByBarcode(input.userId, input.barcode);
      if (found) return [found];
      // No lo tenemos: se busca en Open Food Facts y se guarda para todos.
      const product = await this.off.product(input.barcode);
      const data = product ? foodFromOff(product) : null;
      if (!data) return [];
      const created = await this.foods.createFromOpenFoodFacts(
        input.barcode,
        data,
      );
      return created ? [created] : [];
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
