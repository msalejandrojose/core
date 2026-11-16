import { describe, expect, it } from 'vitest';
import { buildDays, localDay, sleepByDay, toWorkouts, weightByDay } from './device-health.aggregate';

// Fechas locales sin zona: así el test vale en cualquier huso del Mac/CI.
const at = (s: string) => new Date(s).toISOString();

describe('device-health.aggregate', () => {
  it('imputa la noche al día en que te despiertas, con sus fases', () => {
    const night = sleepByDay([
      { value: 0, startDate: at('2026-11-14T23:30:00'), endDate: at('2026-11-15T03:30:00'), sleepState: 'light', sourceId: 'watch' },
      { value: 0, startDate: at('2026-11-15T03:30:00'), endDate: at('2026-11-15T05:00:00'), sleepState: 'deep', sourceId: 'watch' },
      { value: 0, startDate: at('2026-11-15T05:00:00'), endDate: at('2026-11-15T06:30:00'), sleepState: 'rem', sourceId: 'watch' },
      { value: 0, startDate: at('2026-11-15T06:30:00'), endDate: at('2026-11-15T06:45:00'), sleepState: 'awake', sourceId: 'watch' },
    ]);
    expect(night.get('2026-11-15')).toEqual({
      sleepSec: 7 * 3600,
      deepSleepSec: 1.5 * 3600,
      remSleepSec: 1.5 * 3600,
      awakeSec: 15 * 60,
    });
  });

  it('con dos apps en la misma noche se queda con una, no las suma', () => {
    const night = sleepByDay([
      { value: 0, startDate: at('2026-11-14T23:00:00'), endDate: at('2026-11-15T06:00:00'), sleepState: 'asleep', sourceId: 'apple' },
      { value: 0, startDate: at('2026-11-14T23:10:00'), endDate: at('2026-11-15T06:40:00'), sleepState: 'asleep', sourceId: 'garmin' },
    ]);
    expect(night.get('2026-11-15')?.sleepSec).toBe(7.5 * 3600);
  });

  it('usa las fases del registro cuando las trae (Health Connect)', () => {
    const night = sleepByDay([
      {
        value: 0,
        startDate: at('2026-11-14T23:00:00'),
        endDate: at('2026-11-15T07:00:00'),
        stages: [
          { startDate: at('2026-11-14T23:00:00'), endDate: at('2026-11-15T05:00:00'), stage: 'light', durationMinutes: 360 },
          { startDate: at('2026-11-15T05:00:00'), endDate: at('2026-11-15T07:00:00'), stage: 'deep', durationMinutes: 120 },
        ],
      },
    ]);
    expect(night.get('2026-11-15')).toEqual({ sleepSec: 8 * 3600, deepSleepSec: 2 * 3600 });
  });

  it('ignora siestas de menos de media hora', () => {
    const night = sleepByDay([
      { value: 0, startDate: at('2026-11-15T15:00:00'), endDate: at('2026-11-15T15:20:00'), sleepState: 'asleep' },
    ]);
    expect(night.size).toBe(0);
  });

  it('se queda con el último peso del día', () => {
    const w = weightByDay([
      { value: 76.44, startDate: at('2026-11-15T08:00:00'), endDate: at('2026-11-15T08:00:00') },
      { value: 75.96, startDate: at('2026-11-15T21:00:00'), endDate: at('2026-11-15T21:00:00') },
    ]);
    expect(w.get('2026-11-15')).toBe(76);
  });

  it('junta pasos, pulso, HRV, sueño y peso por día', () => {
    const days = buildDays({
      steps: [{ startDate: at('2026-11-15T00:00:00'), value: 9876.4 }, { startDate: at('2026-11-16T00:00:00'), value: 0 }],
      restingHr: [
        { value: 52, startDate: at('2026-11-15T09:00:00'), endDate: at('2026-11-15T09:00:00') },
        { value: 55, startDate: at('2026-11-15T20:00:00'), endDate: at('2026-11-15T20:00:00') },
      ],
      hrv: [{ value: 47.6, startDate: at('2026-11-15T04:00:00'), endDate: at('2026-11-15T04:00:00') }],
      sleep: [],
      weight: [{ value: 76.2, startDate: at('2026-11-14T08:00:00'), endDate: at('2026-11-14T08:00:00') }],
    });
    expect(days).toEqual([
      { day: '2026-11-14', weightKg: 76.2 },
      { day: '2026-11-15', steps: 9876, restingHr: 54, hrvMs: 48 },
    ]);
  });

  it('prepara los entrenos con id estable y quita los de menos de un minuto', () => {
    const w = toWorkouts([
      { workoutType: 'running', duration: 2460.4, totalEnergyBurned: 410.2, totalDistance: 7200.6, startDate: 'a', endDate: 'b', platformId: 'UUID-1', sourceName: 'Entrenamiento' },
      { workoutType: 'walking', duration: 30, startDate: 'c', endDate: 'd' },
      { workoutType: 'yoga', duration: 1800, startDate: 'e', endDate: 'f', sourceId: 'com.app' },
    ]);
    expect(w).toEqual([
      { id: 'UUID-1', workoutType: 'running', startDate: 'a', endDate: 'b', durationSec: 2460, kcal: 410, distanceM: 7201, sourceName: 'Entrenamiento' },
      { id: 'com.app:e', workoutType: 'yoga', startDate: 'e', endDate: 'f', durationSec: 1800, sourceId: 'com.app' },
    ]);
  });

  it('localDay usa la zona horaria del teléfono', () => {
    expect(localDay(at('2026-11-15T23:59:00'))).toBe('2026-11-15');
  });
});
