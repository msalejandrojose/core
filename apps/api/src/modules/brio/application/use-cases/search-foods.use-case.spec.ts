/* eslint-disable @typescript-eslint/require-await -- dobles de prueba */
import { SearchFoodsUseCase } from './search-foods.use-case';

const FOOD = { id: 'f1', name: 'Yogur' };

function setup(opts: {
  local?: unknown;
  product?: unknown;
  created?: unknown;
}) {
  const foods = {
    findByBarcode: jest.fn(async () => opts.local ?? null),
    createFromOpenFoodFacts: jest.fn(async () => opts.created ?? null),
    search: jest.fn(async () => []),
  };
  const off = { product: jest.fn(async () => opts.product ?? null) };
  return { foods, off, useCase: new SearchFoodsUseCase(foods as never, off) };
}

const product = {
  product_name: 'Yogur',
  nutriments: { 'energy-kcal_100g': 60 },
};

describe('SearchFoodsUseCase por código de barras', () => {
  it('si ya lo tenemos no pregunta a Open Food Facts', async () => {
    const t = setup({ local: FOOD });
    expect(await t.useCase.execute({ userId: 'u', barcode: '841' })).toEqual([
      FOOD,
    ]);
    expect(t.off.product).not.toHaveBeenCalled();
  });

  it('si no, lo importa de Open Food Facts y lo devuelve', async () => {
    const t = setup({ product, created: FOOD });
    expect(await t.useCase.execute({ userId: 'u', barcode: '841' })).toEqual([
      FOOD,
    ]);
    expect(t.foods.createFromOpenFoodFacts).toHaveBeenCalledWith(
      '841',
      expect.objectContaining({ name: 'Yogur', kcalPer100: 60 }),
    );
  });

  it('producto desconocido o incompleto: lista vacía', async () => {
    expect(
      await setup({}).useCase.execute({ userId: 'u', barcode: '841' }),
    ).toEqual([]);
    const t = setup({ product: { product_name: 'Sin datos' } });
    expect(await t.useCase.execute({ userId: 'u', barcode: '841' })).toEqual(
      [],
    );
    expect(t.foods.createFromOpenFoodFacts).not.toHaveBeenCalled();
  });
});
