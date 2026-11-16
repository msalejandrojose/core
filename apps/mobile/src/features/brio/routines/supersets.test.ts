import { describe, expect, it } from 'vitest';
import { closesRound, normalizeGroups, restLabel, toggleLink } from './supersets';

describe('supersets', () => {
  it('une con el siguiente y amplía una superserie existente', () => {
    let g = toggleLink([null, null, null], 0);
    expect(g).toEqual([1, 1, null]);
    g = toggleLink(g, 1);
    expect(g).toEqual([1, 1, 1]);
  });

  it('separa por el punto elegido y deshace grupos de uno', () => {
    expect(toggleLink([1, 1, 1], 1)).toEqual([1, 1, null]);
    expect(toggleLink([1, 1], 0)).toEqual([null, null]);
  });

  it('une dos superseries contiguas en una', () => {
    expect(toggleLink([1, 1, 2, 2], 1)).toEqual([1, 1, 1, 1]);
  });

  it('normaliza como la API y sabe dónde acaba la vuelta', () => {
    expect(normalizeGroups([5, 5, null, 9])).toEqual([1, 1, null, null]);
    expect([0, 1, 2].map((i) => closesRound([1, 1, null], i))).toEqual([false, true, true]);
  });

  it('textos de descanso', () => {
    expect([0, 30, 60, 90, 120].map(restLabel)).toEqual(['Sin descanso', '30 s', '1 min', '1:30', '2 min']);
  });
});
