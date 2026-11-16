import { describe, expect, it } from 'vitest';
import { currentMoment } from './moment';

const at = (h: number, m = 0) => new Date(2026, 10, 16, h, m);
const base = { planned: null, mealsLogged: [], weighedToday: true } as const;

describe('currentMoment', () => {
  it('el entreno manda cuando se acerca su hora', () => {
    const planned = { title: 'Fuerza · Pierna', startTime: '18:30' };
    expect(currentMoment({ ...base, now: at(17, 15), planned })).toEqual({ kind: 'workout', title: 'Fuerza · Pierna', time: '18:30' });
    expect(currentMoment({ ...base, now: at(12), planned })).toEqual({ kind: 'meal', meal: 'LUNCH' });
  });
  it('sin hora, el entreno se propone por la tarde', () => {
    const planned = { title: 'Rodaje', startTime: null };
    expect(currentMoment({ ...base, now: at(19), planned })?.kind).toBe('workout');
  });
  it('por la mañana, pesarse si no se ha hecho', () => {
    expect(currentMoment({ ...base, weighedToday: false, now: at(8) })).toEqual({ kind: 'weigh' });
  });
  it('la comida del momento que falta, o nada', () => {
    expect(currentMoment({ ...base, now: at(21) })).toEqual({ kind: 'meal', meal: 'DINNER' });
    expect(currentMoment({ ...base, now: at(21), mealsLogged: ['DINNER'] })).toBeNull();
  });
});
