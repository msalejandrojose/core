import { describe, expect, it } from 'vitest';
import { isPlanMeal, isPlanned, planMealKcal, portionGrams, stepServings } from './plan-meal';

const lentejas = { kcalPer100: 150, servings: [{ id: 'r', label: '1 ración', grams: 400, isDefault: true }] };

describe('poner algo en el menú', () => {
  it('reconoce las comidas del día', () => {
    expect(isPlanMeal('LUNCH')).toBe(true);
    expect(isPlanMeal('BRUNCH')).toBe(false);
    expect(isPlanMeal(undefined)).toBe(false);
  });

  it('calcula gramos y kcal por raciones o por gramos', () => {
    expect(portionGrams(lentejas, { servingId: 'r', quantity: 1.5 })).toBe(600);
    expect(planMealKcal(lentejas, { servingId: 'r', quantity: 1.5 })).toBe(900);
    expect(planMealKcal(lentejas, { servingId: null, quantity: 200 })).toBe(300);
    expect(portionGrams(lentejas, { servingId: 'borrada', quantity: 1 })).toBe(0);
  });

  it('sube y baja raciones de media en media sin salirse', () => {
    expect(stepServings(1, 1)).toBe(1.5);
    expect(stepServings(0.5, -1)).toBe(0.5);
    expect(stepServings(20, 1)).toBe(20);
  });

  it('distingue lo planificado del plato sugerido', () => {
    expect(isPlanned({ source: 'PLANNED', items: [{} as never] })).toBe(true);
    expect(isPlanned({ source: 'SUGGESTED', items: [] })).toBe(false);
    expect(isPlanned({})).toBe(false);
  });
});
