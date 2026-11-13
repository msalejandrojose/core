import { describe, expect, it } from 'vitest';
import type { BrioProfile } from '../api';
import { buildReport, statusFor } from './report';
import type { ProgressDay } from './stats';

const profile = { tdeeKcal: 2700, proteinTargetG: 150 } as BrioProfile;
const d = (p: Partial<ProgressDay>): ProgressDay => ({
  day: '2026-11-10',
  kcalIn: 2200,
  kcalBurned: 0,
  kcalTarget: 2200,
  proteinG: 160,
  sessions: 0,
  activeMinutes: 0,
  mealsLogged: 4,
  ...p,
});

describe('statusFor', () => {
  it('umbrales de cumplido, cerca y por debajo', () => {
    expect(statusFor(0.97)).toBe('ok');
    expect(statusFor(0.85)).toBe('near');
    expect(statusFor(0.5)).toBe('low');
  });
});

describe('buildReport', () => {
  it('una semana cerrada y cumplida', () => {
    const days = Array.from({ length: 7 }, (_, i) => d({ day: `2026-11-0${i + 2}`, sessions: i % 2, activeMinutes: (i % 2) * 45 }));
    const groups = buildReport(days, profile, 7, false);
    const all = groups.flatMap((g) => g.items);
    expect(all.find((i) => i.label === 'Media ingerida')?.status).toBe('ok');
    expect(all.find((i) => i.label === 'Balance medio')?.value).toBe('−500');
    expect(all.find((i) => i.label === 'Días registrados')?.value).toBe('7 de 7');
    expect(all.find((i) => i.label === 'Entrenos')?.value).toBe('3');
  });

  it('los días sin registro no hunden la media', () => {
    const groups = buildReport([d({}), d({ kcalIn: 0, mealsLogged: 0, proteinG: 0 })], profile, 2, false);
    expect(groups[1].items[0].value).toBe('2.200 kcal');
    expect(groups[2].items[0].value).toBe('1 de 2');
  });

  it('en curso no da nada por fallado', () => {
    const groups = buildReport([d({ kcalIn: 900, mealsLogged: 1 })], profile, 1, true);
    expect(groups[1].items[0].status).toBe('pending');
  });
});
