import type { Food } from '../../domain/entities/food.entity';

export const NUTRE_FOOD_REPOSITORY = Symbol('NUTRE_FOOD_REPOSITORY');

export interface CreateFoodData {
  ownerUserId: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  isLiquid: boolean;
  kcalPer100: number;
  proteinPer100G: number;
  carbsPer100G: number;
  fatPer100G: number;
  servings: { label: string; grams: number; isDefault: boolean }[];
}

export interface NutreFoodRepositoryPort {
  /**
   * Busca por nombre o marca en el catálogo compartido más los alimentos
   * propios del usuario. Los verificados salen primero.
   */
  search(userId: string, query: string, limit: number): Promise<Food[]>;
  findByBarcode(userId: string, barcode: string): Promise<Food | null>;
  findVisibleTo(id: string, userId: string): Promise<Food | null>;
  create(data: CreateFoodData): Promise<Food>;
}
