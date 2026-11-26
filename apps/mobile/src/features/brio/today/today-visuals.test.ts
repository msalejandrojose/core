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

  it('la semana: check si entrenaste (también hoy), icono del deporte y estados del plan', () => {
    const run = { id: 'p', day: '', kind: 'RUN', title: 'Rodaje', load: 'MEDIUM' } as never;
    const days = [
      { day: '2026-11-16', status: 'DONE' as const, workouts: [{ id: 'a', kind: 'OTHER', code: 'football_7', title: 'Fútbol 7', durationSec: 3600, distanceM: null }] },
      { day: '2026-11-17', status: 'PLANNED' as const, planned: run },
      { day: '2026-11-15', status: 'MISSED' as const, planned: run },
      { day: '2026-11-14', status: 'REST' as const },
      // Sin plan, pero jugaste al pádel y fuiste al gimnasio: cuenta.
      {
        day: '2026-11-13',
        status: 'FREE' as const,
        workouts: [
          { id: 'b', kind: 'OTHER', code: 'padel', title: 'Pádel', durationSec: 3600, distanceM: null },
          { id: 'c', kind: 'STRENGTH', code: 'strength', title: 'Gimnasio', durationSec: 3600, distanceM: null },
        ],
      },
      // Tocaba correr y jugaste al fútbol: también cuenta como entrenado.
      { day: '2026-11-12', status: 'MISSED' as const, planned: run, workouts: [{ id: 'd', kind: 'OTHER', code: 'football', title: 'Fútbol', durationSec: 3600, distanceM: null }] },
    ];
    const w = weekDots(days, '2026-11-16');
    expect(w.map((d) => [d.letter, d.state])).toEqual([
      ['L', 'done'],
      ['M', 'planned'],
      ['D', 'missed'],
      ['S', 'rest'],
      ['V', 'done'],
      ['J', 'done'],
    ]);
    expect(w[0]).toMatchObject({ isToday: true, sport: { code: 'football_7' }, label: 'lunes (hoy): Fútbol 7, hecho hoy' });
    expect(w[1].sport).toMatchObject({ kind: 'RUN' });
    expect(w[3].sport).toBeNull();
    expect(w[4]).toMatchObject({ extra: 1, sport: { code: 'padel' }, label: 'viernes: Pádel y Gimnasio, hecho' });
  });

  it('hoy sin entrenar aún sale como «hoy» con lo planificado', () => {
    const run = { kind: 'RUN', title: 'Rodaje', load: 'MEDIUM' } as never;
    const [d] = weekDots([{ day: '2026-11-16', status: 'TODAY', planned: run }], '2026-11-16');
    expect(d).toMatchObject({ state: 'today', isToday: true, sport: { kind: 'RUN' }, label: 'lunes: Rodaje, hoy' });
  });
});
