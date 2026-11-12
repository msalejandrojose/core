import { describe, expect, it } from 'vitest';
import { avgOf, dayBuckets, isoWeek, lastWeightIn, mondayOf, monthBuckets, weekBuckets, type ProgressDay } from './stats';

const day = (d: string, kcalIn: number, mealsLogged = 3): ProgressDay => ({
  day: d,
  kcalIn,
  kcalBurned: 0,
  kcalTarget: 2200,
  proteinG: 100,
  sessions: 0,
  activeMinutes: 0,
  mealsLogged,
});

describe('semanas ISO', () => {
  it('numera como el calendario europeo', () => {
    expect(isoWeek('2026-11-12')).toBe(46);
    expect(isoWeek('2026-01-01')).toBe(1);
    expect(isoWeek('2027-01-01')).toBe(53);
  });
  it('el lunes de la semana', () => {
    expect(mondayOf('2026-11-12')).toBe('2026-11-09');
    expect(mondayOf('2026-11-09')).toBe('2026-11-09');
  });
});

describe('tramos', () => {
  it('siete días con su inicial', () => {
    const b = dayBuckets('2026-11-12', 7);
    expect(b.map((x) => x.label).join('')).toBe('VSDLMXJ');
    expect(b[6]).toMatchObject({ from: '2026-11-12', to: '2026-11-12' });
  });
  it('cuatro semanas de lunes a domingo', () => {
    const b = weekBuckets('2026-11-12', 4);
    expect(b.map((x) => x.label)).toEqual(['S43', 'S44', 'S45', 'S46']);
    expect(b[3]).toMatchObject({ from: '2026-11-09', to: '2026-11-15' });
  });
  it('meses completos', () => {
    const b = monthBuckets('2026-11-12', 3);
    expect(b.map((x) => x.label)).toEqual(['Sep', 'Oct', 'Nov']);
    expect(b[1]).toMatchObject({ from: '2026-10-01', to: '2026-10-31' });
  });
});

describe('medias', () => {
  it('ignora los días sin registro', () => {
    const days = [day('2026-11-10', 2000), day('2026-11-11', 1000), day('2026-11-12', 0, 0)];
    const b = { label: 'x', from: '2026-11-10', to: '2026-11-12' };
    expect(avgOf(days, b, (d) => d.kcalIn)).toBe(1500);
    expect(avgOf([], b, (d) => d.kcalIn)).toBeNull();
  });
  it('último peso del tramo', () => {
    const w = [
      { day: '2026-11-01', weightKg: 81, bodyFatPct: null },
      { day: '2026-11-05', weightKg: 80.5, bodyFatPct: null },
    ];
    expect(lastWeightIn(w, { label: 'x', from: '2026-11-01', to: '2026-11-07' })).toBe(80.5);
    expect(lastWeightIn(w, { label: 'x', from: '2026-11-08', to: '2026-11-14' })).toBeNull();
  });
});
