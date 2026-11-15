import { describe, expect, it } from 'vitest';
import { monthCells, weekCells, yearCells } from './digestion-calendar';

describe('calendario de digestión', () => {
  const marks = [
    { day: '2026-11-15', count: 2, mainType: 4 },
    { day: '2026-11-13', count: 1, mainType: 6 },
    { day: '2026-10-02', count: 3, mainType: 2 },
  ];

  it('la semana son los 7 días que acaban hoy, con su inicial', () => {
    const w = weekCells(marks, '2026-11-15');
    expect(w).toHaveLength(7);
    expect(w[0]).toMatchObject({ key: '2026-11-09', label: 'L 9', count: 0, mainType: null });
    expect(w[6]).toMatchObject({ key: '2026-11-15', label: 'D 15', count: 2, mainType: 4, isToday: true });
  });

  it('el mes se alinea por semanas empezando en lunes', () => {
    const m = monthCells(marks, '2026-11-15');
    // 30 días desde el 17 de octubre, que es sábado: 5 huecos delante.
    expect(m.filter((c) => c.key.startsWith('pad'))).toHaveLength(5);
    expect(m.filter((c) => !c.key.startsWith('pad'))).toHaveLength(30);
  });

  it('el año suma las veces del mes y elige el tipo que más se repite', () => {
    const y = yearCells(marks, '2026-11-15');
    expect(y).toHaveLength(12);
    expect(y[11]).toMatchObject({ key: '2026-11', label: 'nov', count: 3, mainType: 4 });
    expect(y[10]).toMatchObject({ key: '2026-10', count: 3, mainType: 2 });
    expect(y[0]).toMatchObject({ key: '2025-12', count: 0, mainType: null });
  });
});
