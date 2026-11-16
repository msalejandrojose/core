import type { OffProduct } from '../../domain/services/open-food-facts';

export const OPEN_FOOD_FACTS = Symbol('BRIO_OPEN_FOOD_FACTS');

export interface OpenFoodFactsPort {
  /** Producto por código de barras; null si no existe o el servicio no responde. */
  product(barcode: string): Promise<OffProduct | null>;
}
