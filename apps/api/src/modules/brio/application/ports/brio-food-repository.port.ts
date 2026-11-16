import type { Food } from '../../domain/entities/food.entity';
import type { OffFood } from '../../domain/services/open-food-facts';

export const BRIO_FOOD_REPOSITORY = Symbol('BRIO_FOOD_REPOSITORY');

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

export interface BrioFoodRepositoryPort {
  /**
   * Busca por nombre o marca en el catálogo compartido más los alimentos
   * propios del usuario. Los verificados salen primero.
   */
  search(userId: string, query: string, limit: number): Promise<Food[]>;
  findByBarcode(userId: string, barcode: string): Promise<Food | null>;
  findVisibleTo(id: string, userId: string): Promise<Food | null>;
  create(data: CreateFoodData): Promise<Food>;
  /**
   * Recetas del usuario: sus alimentos propios cuya ración por defecto lleva
   * la etiqueta de receta. Las más nuevas primero.
   */
  findOwnRecipes(userId: string, servingLabel: string): Promise<Food[]>;
  /**
   * Alimento del catálogo compartido importado de Open Food Facts. Si otro ya
   * reclamó ese código (carrera o alimento propio de alguien), devuelve null.
   */
  createFromOpenFoodFacts(barcode: string, data: OffFood): Promise<Food | null>;
  /** Del catálogo compartido, por nombre exacto, en el orden pedido. */
  findGlobalByNames(names: readonly string[]): Promise<Food[]>;
}
