import { Inject, Injectable } from '@nestjs/common';
import type { Food } from '../../domain/entities/food.entity';
import {
  INGREDIENT_GROUPS,
  SANDWICH_BASES,
  sandwichFoodNames,
  type SandwichBase,
} from '../../domain/services/sandwich-builder';
import {
  BRIO_FOOD_REPOSITORY,
  type BrioFoodRepositoryPort,
} from '../ports/brio-food-repository.port';

export interface SandwichBuilderView {
  bases: (Omit<SandwichBase, 'food'> & { food: Food })[];
  groups: { code: string; label: string; foods: Food[] }[];
}

/** Bases e ingredientes del creador de bocatas y tostadas, con sus alimentos del catálogo. */
@Injectable()
export class SandwichBuilderUseCase {
  constructor(
    @Inject(BRIO_FOOD_REPOSITORY)
    private readonly foods: BrioFoodRepositoryPort,
  ) {}

  async execute(): Promise<SandwichBuilderView> {
    const byName = new Map(
      (await this.foods.findGlobalByNames(sandwichFoodNames())).map((f) => [f.name, f]),
    );
    return {
      bases: SANDWICH_BASES.flatMap((b) => {
        const food = byName.get(b.food);
        return food ? [{ ...b, food }] : [];
      }),
      groups: INGREDIENT_GROUPS.map((g) => ({
        code: g.code,
        label: g.label,
        foods: g.foods.map((n) => byName.get(n)).filter((f): f is Food => !!f),
      })).filter((g) => g.foods.length > 0),
    };
  }
}
