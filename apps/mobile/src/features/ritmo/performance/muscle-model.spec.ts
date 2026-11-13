import { describe, expect, it } from 'vitest';
import { MUSCLE_NAME } from './labels';
import { BODY_PARTS, MUSCLE_PARTS, expand, heatRgb, mixRgb } from './muscle-model';

describe('modelo del mapa muscular 3D', () => {
  it('dibuja todos los músculos que analiza la app, y ninguno de más', () => {
    expect(Object.keys(MUSCLE_PARTS).sort()).toEqual(Object.keys(MUSCLE_NAME).sort());
  });

  it('refleja las piezas pares y deja las centrales', () => {
    const out = expand([{ p: [0.1, 1, 0], s: [1, 1, 1], mirror: true }, { p: [0, 1, 0], s: [1, 1, 1] }]);
    expect(out.map((x) => x.p[0])).toEqual([0.1, -0.1, 0]);
  });

  it('mantiene la figura dentro de una persona de pie', () => {
    for (const part of expand([...BODY_PARTS, ...Object.values(MUSCLE_PARTS).flat()])) {
      expect(part.p[1] - part.s[1]).toBeGreaterThanOrEqual(0);
      expect(part.p[1] + part.s[1]).toBeLessThan(1.8);
      expect(Math.abs(part.p[0]) + part.s[0]).toBeLessThan(0.32);
    }
  });

  it('colorea de la superficie al color de actividad', () => {
    const white: [number, number, number] = [255, 255, 255];
    const green: [number, number, number] = [0, 200, 0];
    expect(heatRgb(0, white, green)).toEqual(white);
    expect(heatRgb(1, white, green)).toEqual(green);
    expect(heatRgb(5, white, green)).toEqual(green);
    expect(mixRgb(white, green, 0.5)).toEqual([128, 228, 128]);
  });
});
