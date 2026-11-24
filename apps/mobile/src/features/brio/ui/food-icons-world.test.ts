import { describe, expect, it } from 'vitest';
import { FOOD_ICONS, iconForFood } from './food-icons.data';

describe('dibujos de las cocinas del mundo', () => {
  it('existen los de las secciones nuevas', () => {
    for (const key of ['sushi', 'taco', 'kebab', 'arepa', 'curry', 'pasta', 'burger']) {
      expect(FOOD_ICONS).toHaveProperty(key);
    }
  });

  it('cada plato nuevo saca un dibujo con sentido', () => {
    expect(iconForFood('Sushi variado (maki y nigiri)')).toBe('sushi');
    expect(iconForFood('Tacos de pescado')).toBe('taco');
    expect(iconForFood('Kebab de pollo en pan de pita')).toBe('kebab');
    expect(iconForFood('Dürüm de ternera')).toBe('kebab');
    expect(iconForFood('Arepa de queso')).toBe('arepa');
    expect(iconForFood('Pad thai de pollo')).toBe('pasta');
    expect(iconForFood('Lasaña de carne')).toBe('pasta');
    expect(iconForFood('Hummus')).toBe('lentils');
    expect(iconForFood('Guacamole')).toBe('avocado');
    expect(iconForFood('Pan naan')).toBe('bread');
    expect(iconForFood('Tiramisú')).toBe('flan');
  });
});
