import { describe, expect, it } from 'vitest';
import { clampFactor, factorLabel, scaleItem, stepFactor, nextQuickFactor } from './portion';

const salmon = { foodId: 'f', name: 'Salmón', quantityG: 150, kcal: 307.5, proteinG: 33, carbsG: 0, fatG: 19.5 };

describe('multiplicador de ración', () => {
  it('multiplica cantidad, kcal y macros', () => {
    const s = scaleItem(salmon, 1.3);
    expect(s.quantityG).toBe(195);
    expect(s.kcal).toBeCloseTo(399.75);
    expect(s.proteinG).toBeCloseTo(42.9);
    expect(scaleItem(salmon, 2).quantityG).toBe(300);
    expect(scaleItem(salmon, 1)).toBe(salmon);
  });

  it('pasos de 0,1 y límites', () => {
    expect(stepFactor(1, 1)).toBe(1.1);
    expect(stepFactor(1.2, 1)).toBe(1.3);
    expect(stepFactor(0.1, -1)).toBe(0.1);
    expect(clampFactor(25)).toBe(10);
    expect(clampFactor(Number.NaN)).toBe(1);
  });

  it('etiquetas', () => {
    expect([0.5, 1, 1.3, 1.5, 2].map(factorLabel)).toEqual(['½', '×1', '×1,3', '1½', '×2']);
  });
});

describe('nextQuickFactor', () => {
  it('recorre 1 → 1½ → 2 → ½ → 1', () => {
    expect(nextQuickFactor(1)).toBe(1.5);
    expect(nextQuickFactor(1.5)).toBe(2);
    expect(nextQuickFactor(2)).toBe(0.5);
    expect(nextQuickFactor(0.5)).toBe(1);
  });
  it('desde un valor afinado salta al siguiente típico', () => {
    expect(nextQuickFactor(1.3)).toBe(1.5);
    expect(nextQuickFactor(2.4)).toBe(0.5);
  });
});
