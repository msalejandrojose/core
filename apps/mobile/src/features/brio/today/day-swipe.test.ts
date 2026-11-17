import { describe, expect, it } from 'vitest';
import { swipeStep } from './day-swipe';

describe('swipeStep', () => {
  it('a la derecha es el día anterior; a la izquierda, el siguiente', () => {
    expect(swipeStep(80, 5)).toBe(-1);
    expect(swipeStep(-80, 5)).toBe(1);
  });
  it('ignora toques cortos y el scroll vertical', () => {
    expect(swipeStep(30, 0)).toBeNull();
    expect(swipeStep(70, 60)).toBeNull();
  });
});
