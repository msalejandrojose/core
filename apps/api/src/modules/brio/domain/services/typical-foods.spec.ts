import { TYPICAL_FOODS } from '../../../../seeds/brio-foods.data';
import { MEAL_SECTIONS } from './typical-foods';

// Los del catálogo básico de seed-brio.ts que también se ofrecen.
const BASIC = [
  'Yogur natural',
  'Plátano',
  'Manzana',
  'Almendras crudas',
  'Pechuga de pollo a la plancha',
  'Pan de trigo',
  'Leche semidesnatada',
  'Aguacate',
  'Avena en copos',
  'Huevo entero',
  'Lentejas cocidas',
  'Arroz blanco cocido',
  'Patata cocida',
  'Atún al natural',
];
// Dibujos que existen en la app (ui/food-icons.data.ts).
const ICONS = [
  'coffee',
  'croissant',
  'sandwich',
  'apple',
  'yogurt',
  'omelette',
  'salad',
  'steak',
  'salmon',
  'flan',
  'drink',
  'toast',
  'oats',
  'nuts',
  'chorizo',
  'lentils',
  'rice',
  'potato',
  'soup',
  'burger',
];

describe('secciones de comidas típicas', () => {
  const all = Object.values(MEAL_SECTIONS).flat();

  it('cada plato existe en el catálogo que se siembra', () => {
    const known = new Set([...TYPICAL_FOODS.map((f) => f.name), ...BASIC]);
    for (const s of all)
      for (const n of s.foods) expect(known.has(n) ? n : `falta: ${n}`).toBe(n);
  });

  it('cada sección tiene un dibujo conocido y al menos dos platos', () => {
    for (const s of all) {
      expect(ICONS).toContain(s.icon);
      expect(s.foods.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('los cuatro momentos del día tienen secciones sin códigos repetidos', () => {
    for (const sections of Object.values(MEAL_SECTIONS)) {
      expect(sections.length).toBeGreaterThanOrEqual(6);
      expect(new Set(sections.map((s) => s.code)).size).toBe(sections.length);
    }
  });
});
