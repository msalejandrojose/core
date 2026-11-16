import { describe, expect, it } from 'vitest';
import { dayRings, greeting, macroBars, weekDots } from './today-visuals';

const totals = {
  kcalIn: 1400,
  kcalBurned: 400,
  kcalBurnedCounted: 300,
  kcalTarget: 2400,
  kcalRemaining: 1300,
  proteinG: 96.4,
  carbsG: 180,
  fatG: 48,
  weightKg: 76,
};

describe('today-visuals', () => {
  it('saluda según la hora y con el primer nombre', () => {
    expect(greeting(8, 'Ana María')).toBe('Buenos días, Ana');
    expect(greeting(15, null)).toBe('Buenas tardes');
    expect(greeting(23, ' ')).toBe('Buenas noches');
    expect(greeting(3, 'Leo')).toBe('Buenas noches, Leo');
  });

  it('anillos: comida sobre lo disponible, entreno sobre lo planificado y pasos', () => {
    const r = dayRings({ totals, activeMinutes: 34, plannedMinutes: 45, steps: 8432 });
    expect(r.map((x) => x.key)).toEqual(['food', 'move', 'steps']);
    expect(r[0].ratio).toBeCloseTo(1400 / 2700);
    expect(r[0].value).toBe('1.300 kcal quedan');
    expect(r[1].value).toBe('34 de 45 min');
    expect(r[2].value).toBe('8.432 pasos');
  });

  it('sin pasos no hay tercer anillo y sin plan el entreno va contra 30 min', () => {
    const r = dayRings({ totals: { ...totals, kcalRemaining: -150 }, activeMinutes: 60, plannedMinutes: null, steps: null });
    expect(r).toHaveLength(2);
    expect(r[0].value).toBe('150 kcal de más');
    expect(r[1].ratio).toBe(2);
  });

  it('macros frente a su objetivo; sin objetivo, barra vacía', () => {
    const m = macroBars(totals, { proteinG: 140, carbsG: null, fatG: 80 });
    expect(m[0]).toMatchObject({ grams: 96, target: 140 });
    expect(m[0].ratio).toBeCloseTo(96.4 / 140);
    expect(m[1]).toMatchObject({ target: null, ratio: 0 });
  });

  it('la semana: letras, estados y hoy marcado aunque ya esté hecho', () => {
    const days = [
      { day: '2026-11-16', status: 'DONE' as const },
      { day: '2026-11-17', status: 'PLANNED' as const },
      { day: '2026-11-15', status: 'MISSED' as const },
      { day: '2026-11-14', status: 'REST' as const },
    ];
    const w = weekDots(days, '2026-11-16');
    expect(w.map((d) => [d.letter, d.state])).toEqual([
      ['L', 'today'],
      ['M', 'planned'],
      ['D', 'missed'],
      ['S', 'rest'],
    ]);
    expect(w[0].label).toBe('lunes: hecho hoy');
  });
});
