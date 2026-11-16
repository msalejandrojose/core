import { Injectable, Logger } from '@nestjs/common';
import type { OffProduct } from '../../domain/services/open-food-facts';
import type { OpenFoodFactsPort } from '../../application/ports/open-food-facts.port';

const BASE = 'https://world.openfoodfacts.org/api/v2/product';
const FIELDS = [
  'product_name',
  'product_name_es',
  'generic_name_es',
  'brands',
  'quantity',
  'serving_size',
  'serving_quantity',
  'nutriments',
].join(',');
const TIMEOUT_MS = 6000;

/**
 * Cliente de Open Food Facts. Solo se manda el código de barras, nada del
 * usuario. Open Food Facts pide identificar la app en el User-Agent.
 */
@Injectable()
export class HttpOpenFoodFactsClient implements OpenFoodFactsPort {
  private readonly logger = new Logger(HttpOpenFoodFactsClient.name);

  async product(barcode: string): Promise<OffProduct | null> {
    try {
      const res = await fetch(
        `${BASE}/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`,
        {
          headers: {
            'user-agent': 'Brio/1.0 (app de nutricion y entreno)',
            accept: 'application/json',
          },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        },
      );
      if (!res.ok) return null;
      const body = (await res.json()) as {
        status?: number;
        product?: OffProduct;
      };
      return body.status === 1 && body.product ? body.product : null;
    } catch (e) {
      this.logger.warn(`Open Food Facts no respondió: ${String(e)}`);
      return null;
    }
  }
}
