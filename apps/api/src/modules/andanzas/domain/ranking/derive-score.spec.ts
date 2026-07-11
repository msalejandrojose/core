import { deriveScore } from './derive-score';
import { bandFor } from './sentiment-band';

describe('deriveScore', () => {
  it('primer sitio de la banda: punto medio de la banda', () => {
    expect(deriveScore(bandFor('LIKED'), null, null)).toBe(8.5);
  });

  it('mejor de la banda: punto medio entre el máximo y el actual mejor', () => {
    expect(deriveScore(bandFor('LIKED'), null, 8)).toBe(9);
  });

  it('peor de la banda: punto medio entre el actual peor y el mínimo', () => {
    expect(deriveScore(bandFor('LIKED'), 8, null)).toBe(7.5);
  });

  it('entre dos vecinos: punto medio exacto', () => {
    expect(deriveScore(bandFor('NEUTRAL'), 6, 5.5)).toBe(5.75);
  });

  it('cae siempre estrictamente entre sus vecinos (orden global se mantiene)', () => {
    const score = deriveScore(bandFor('LIKED'), 8, 7.5);
    expect(score).toBeGreaterThan(7.5);
    expect(score).toBeLessThan(8);
  });
});
