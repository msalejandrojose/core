import { describe, expect, it } from 'vitest';
import { ATLAS } from './body-atlas';
import { MUSCLE_NAME } from './labels';

describe('atlas del mapa muscular', () => {
  it.each(['male', 'female'] as const)('la figura %s tiene todos los músculos entre frente y espalda', (figure) => {
    const drawn = new Set(
      (['front', 'back'] as const).flatMap((side) => ATLAS[figure][side].parts.flatMap((p) => p.muscles)),
    );
    expect([...drawn].sort()).toEqual(Object.keys(MUSCLE_NAME).sort());
  });

  it.each(['male', 'female'] as const)('la figura %s tiene silueta y trazados en las dos vistas', (figure) => {
    for (const side of ['front', 'back'] as const) {
      const view = ATLAS[figure][side];
      expect(view.viewBox.split(' ')).toHaveLength(4);
      expect(view.outline.length).toBeGreaterThan(100);
      expect(view.parts.every((p) => p.d.length > 0)).toBe(true);
    }
  });
});
