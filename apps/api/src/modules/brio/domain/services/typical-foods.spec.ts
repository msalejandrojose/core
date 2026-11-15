import { TYPICAL_FOODS } from '../../../../seeds/brio-foods.data';
import { TYPICAL_BY_MEAL } from './typical-foods';

// Los del catálogo básico de seed-brio.ts que también se sugieren.
const BASIC = [
  'Yogur natural',
  'Plátano',
  'Manzana',
  'Almendras crudas',
  'Pechuga de pollo a la plancha',
  'Pan de trigo',
];

describe('comidas típicas por momento del día', () => {
  it('cada nombre existe en el catálogo que se siembra', () => {
    const known = new Set([...TYPICAL_FOODS.map((f) => f.name), ...BASIC]);
    for (const names of Object.values(TYPICAL_BY_MEAL)) {
      for (const n of names) expect(known.has(n) ? n : `falta: ${n}`).toBe(n);
    }
  });

  it('hay sugerencias para los cuatro momentos', () => {
    expect(Object.keys(TYPICAL_BY_MEAL).sort()).toEqual([
      'BREAKFAST',
      'DINNER',
      'LUNCH',
      'SNACK',
    ]);
    for (const names of Object.values(TYPICAL_BY_MEAL))
      expect(names.length).toBeGreaterThanOrEqual(12);
  });
});
