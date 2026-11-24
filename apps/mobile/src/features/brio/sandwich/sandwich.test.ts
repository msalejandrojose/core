import { describe, expect, it } from 'vitest';
import type { Food, SandwichBase } from '../api';
import { defaultGramsOf, sandwichItems, sandwichName } from './sandwich';

const food = (id: string, name: string, kcal: number, grams = 30): Food =>
  ({
    id,
    name,
    kcalPer100: kcal,
    proteinPer100G: 10,
    carbsPer100G: 20,
    fatPer100G: 5,
    servings: [{ label: '1 ración', grams, isDefault: true }],
  }) as unknown as Food;

const barra = { code: 'barra', kind: 'bocata', label: 'Media barra', grams: 120, food: food('pan', 'Pan de barra', 270) } as SandwichBase;
const tostada = { ...barra, code: 'tostada', kind: 'tostada', label: 'Tostada', grams: 40 } as SandwichBase;
const jamon = { food: food('j', 'Jamón serrano', 240), grams: 30 };
const tomate = { food: food('t', 'Tomate natural rallado', 20, 40), grams: 40 };
const aceite = { food: food('a', 'Aceite de oliva virgen extra', 900, 5), grams: 5 };
const york = { food: food('y', 'Jamón cocido (york)', 110), grams: 45 };

describe('creador de bocatas y tostadas', () => {
  it('pone nombre según el pan y lo que lleva', () => {
    expect(sandwichName(barra, [jamon, tomate])).toBe('Bocata de jamón serrano y tomate natural rallado');
    expect(sandwichName(tostada, [aceite])).toBe('Tostada con aceite de oliva virgen extra');
    expect(sandwichName(barra, [york])).toBe('Bocata de jamón cocido');
    expect(sandwichName(barra, [])).toBe('Media barra');
    expect(sandwichName(null, [jamon])).toBe('');
  });

  it('con más de tres ingredientes, nombra tres y «y más»', () => {
    expect(sandwichName(barra, [jamon, tomate, aceite, york])).toBe(
      'Bocata de jamón serrano, tomate natural rallado, aceite de oliva virgen extra y más',
    );
  });

  it('el pan va primero con su clave propia y cada ingrediente con sus gramos', () => {
    const items = sandwichItems(barra, [jamon, tomate]);
    expect(items.map((i) => [i.key, i.foodId, i.quantityG])).toEqual([
      ['base', 'pan', 120],
      ['j', 'j', 30],
      ['t', 't', 40],
    ]);
    expect(Math.round(items[0].kcal)).toBe(324);
  });

  it('la cantidad por defecto es la ración del alimento', () => {
    expect(defaultGramsOf(tomate.food)).toBe(40);
  });
});
