import { TYPICAL_FOODS } from '../../../../seeds/brio-foods.data';
import { INGREDIENT_GROUPS, SANDWICH_BASES, sandwichFoodNames } from './sandwich-builder';

// Del catálogo básico de seed-brio.ts.
const BASIC = [
  'Huevo entero',
  'Atún al natural',
  'Pechuga de pollo a la plancha',
  'Aguacate',
  'Plátano',
  'Aceite de oliva virgen extra',
];

describe('creador de bocatas y tostadas', () => {
  it('cada base e ingrediente existe en el catálogo que se siembra', () => {
    const known = new Set([...TYPICAL_FOODS.map((f) => f.name), ...BASIC]);
    for (const n of sandwichFoodNames()) expect(known.has(n) ? n : `falta: ${n}`).toBe(n);
  });

  it('hay bocatas, tostadas, sándwich, wrap y burrito, sin códigos repetidos', () => {
    expect(new Set(SANDWICH_BASES.map((b) => b.kind))).toEqual(
      new Set(['bocata', 'tostada', 'sandwich', 'wrap', 'burrito']),
    );
    expect(new Set(SANDWICH_BASES.map((b) => b.code)).size).toBe(SANDWICH_BASES.length);
    expect(new Set(INGREDIENT_GROUPS.map((g) => g.code)).size).toBe(INGREDIENT_GROUPS.length);
  });
});
