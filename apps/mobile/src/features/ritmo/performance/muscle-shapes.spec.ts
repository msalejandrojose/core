import { describe, expect, it } from 'vitest';
import { MUSCLE_NAME } from './labels';
import { FIGURES, warpPath, widthAt } from './muscle-shapes';

describe('dibujo del mapa muscular', () => {
  it.each(['male', 'female'] as const)('la figura %s tiene todos los músculos entre frente y espalda', (figure) => {
    const f = FIGURES[figure];
    const drawn = new Set([...Object.keys(f.front), ...Object.keys(f.back)]);
    expect([...drawn].sort()).toEqual(Object.keys(MUSCLE_NAME).sort());
  });

  it('la mujer tiene hombros y cintura más estrechos y cadera más ancha', () => {
    expect(widthAt(60)).toBeLessThan(1);
    expect(widthAt(142)).toBeLessThan(widthAt(60));
    expect(widthAt(200)).toBeGreaterThan(1);
    expect(FIGURES.female.body).not.toEqual(FIGURES.male.body);
  });

  it('deformar no mueve el eje ni cambia las alturas', () => {
    expect(warpPath('M100 40 L60 40 C80 50 90 60 100 70 Z', () => 0.5)).toBe('M100 40 L80 40 C90 50 95 60 100 70 Z');
  });

  it('los tramos de la silueta de mujer siguen unidos en la axila', () => {
    // El brazo acaba en la axila (y = 96) con el ancho de hombros, que es donde arranca el tronco.
    expect(widthAt(96)).toBeCloseTo(0.86);
  });
});
