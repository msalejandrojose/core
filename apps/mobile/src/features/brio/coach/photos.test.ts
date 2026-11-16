import { describe, expect, it } from 'vitest';
import { fitSize } from './photos';

describe('fitSize', () => {
  it('reduce el lado largo a 1280 manteniendo la proporción', () => {
    expect(fitSize(4032, 3024)).toEqual({ width: 1280, height: 960 });
    expect(fitSize(3024, 4032)).toEqual({ width: 960, height: 1280 });
  });
  it('no agranda las fotos pequeñas', () => {
    expect(fitSize(800, 600)).toEqual({ width: 800, height: 600 });
  });
});
