import { Inject, Injectable } from '@nestjs/common';
import type { Food } from '../../domain/entities/food.entity';
import type { MealType } from '../../domain/entities/meal-entry.entity';
import { MEAL_SECTIONS } from '../../domain/services/typical-foods';
import {
  BRIO_FOOD_REPOSITORY,
  type BrioFoodRepositoryPort,
} from '../ports/brio-food-repository.port';

export interface FoodSectionView {
  code: string;
  label: string;
  icon: string;
  foods: Food[];
}

/** Secciones de lo típico de un momento del día, con sus platos del catálogo. */
@Injectable()
export class TypicalFoodsUseCase {
  constructor(
    @Inject(BRIO_FOOD_REPOSITORY)
    private readonly foods: BrioFoodRepositoryPort,
  ) {}

  async execute(mealType: MealType): Promise<FoodSectionView[]> {
    const sections = MEAL_SECTIONS[mealType];
    const names = [...new Set(sections.flatMap((s) => s.foods))];
    const byName = new Map(
      (await this.foods.findGlobalByNames(names)).map((f) => [f.name, f]),
    );
    return sections
      .map((s) => ({
        code: s.code,
        label: s.label,
        icon: s.icon,
        foods: s.foods.map((n) => byName.get(n)).filter((f): f is Food => !!f),
      }))
      .filter((s) => s.foods.length > 0);
  }
}
