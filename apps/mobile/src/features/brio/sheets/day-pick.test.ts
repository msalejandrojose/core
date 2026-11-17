import { describe, expect, it } from 'vitest';
import { dayChipLabel, recentDays, zonedIso } from './day-pick';

describe('recentDays', () => {
  it('va de hoy hacia atrás cruzando el mes', () => {
    expect(recentDays('2026-11-02', 4)).toEqual(['2026-11-02', '2026-11-01', '2026-10-31', '2026-10-30']);
  });
});

describe('dayChipLabel', () => {
  const today = '2026-11-17'; // martes
  it('nombra hoy, ayer y los días de la semana', () => {
    expect(dayChipLabel('2026-11-17', today)).toBe('Hoy');
    expect(dayChipLabel('2026-11-16', today)).toBe('Ayer');
    expect(dayChipLabel('2026-11-14', today)).toBe('Sáb 14');
  });
  it('más atrás, día y mes', () => {
    expect(dayChipLabel('2026-11-01', today)).toBe('1 nov');
  });
});

describe('zonedIso', () => {
  it('pasa la hora de Madrid a UTC (invierno y verano)', () => {
    expect(zonedIso('2026-11-10', '19:30', 'Europe/Madrid')).toBe('2026-11-10T18:30:00.000Z');
    expect(zonedIso('2026-07-10', '19:30', 'Europe/Madrid')).toBe('2026-07-10T17:30:00.000Z');
  });
  it('de madrugada sigue siendo ese día', () => {
    expect(zonedIso('2026-11-10', '00:30', 'Europe/Madrid')).toBe('2026-11-09T23:30:00.000Z');
  });
});
