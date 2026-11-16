import { foodFromOff, isBarcode, servingGrams } from './open-food-facts';

describe('open-food-facts', () => {
  it('traduce un producto con nutrientes y ración', () => {
    const f = foodFromOff({
      product_name: 'Yogur natural',
      product_name_es: 'Yogur natural',
      brands: 'Danone, Otra',
      quantity: '4 x 120 g',
      serving_size: '120 g',
      serving_quantity: 120,
      nutriments: {
        'energy-kcal_100g': 61.4,
        proteins_100g: 3.5,
        carbohydrates_100g: 4.7,
        fat_100g: 3.1,
        sugars_100g: 4.7,
        'saturated-fat_100g': 2,
        salt_100g: 0.13,
      },
    })!;
    expect(f).toMatchObject({
      name: 'Yogur natural',
      brand: 'Danone',
      isLiquid: false,
      kcalPer100: 61,
      proteinPer100G: 3.5,
      sodiumPer100Mg: 52,
    });
    expect(f.servings).toEqual([
      { label: '1 ración (120 g)', grams: 120, isDefault: true },
      { label: '100 g', grams: 100, isDefault: false },
    ]);
  });

  it('bebidas en ml y kcal a partir de kJ', () => {
    const f = foodFromOff({
      product_name: 'Refresco',
      quantity: '33 cl',
      serving_size: '1 lata (33 cl)',
      nutriments: { 'energy-kj_100g': 176 },
    })!;
    expect(f.isLiquid).toBe(true);
    expect(f.kcalPer100).toBe(42);
    expect(f.proteinPer100G).toBe(0);
    expect(f.servings[0]).toEqual({
      label: '1 ración (330 ml)',
      grams: 330,
      isDefault: true,
    });
  });

  it('sin nombre o sin energía no vale', () => {
    expect(
      foodFromOff({
        product_name: '',
        nutriments: { 'energy-kcal_100g': 100 },
      }),
    ).toBeNull();
    expect(foodFromOff({ product_name: 'Algo', nutriments: {} })).toBeNull();
    expect(servingGrams({ serving_size: 'un puñado' })).toBeNull();
  });

  it('códigos de barras válidos', () => {
    expect(isBarcode('8410000000000')).toBe(true);
    expect(isBarcode('84A1')).toBe(false);
  });
});
