import {
  deviceDayFrom,
  deviceTypeCode,
  deviceWeight,
  deviceWorkoutFrom,
  isFromGarmin,
  mergeDeviceDay,
  overlaps,
} from './device-health';

describe('device-health', () => {
  it('valida y redondea un día del móvil, descartando valores imposibles', () => {
    const d = deviceDayFrom({
      day: '2026-11-15',
      steps: 8432.6,
      restingHr: 300,
      hrvMs: 48.4,
      sleepSec: 7.5 * 3600,
    });
    expect(d).toEqual({
      day: '2026-11-15',
      steps: 8433,
      restingHr: null,
      hrvMs: 48,
      sleepSec: 27000,
      deepSleepSec: null,
      remSleepSec: null,
      awakeSec: null,
      sleepScore: null,
      stressAvg: null,
      bodyBatteryMax: null,
    });
    expect(deviceDayFrom({ day: '15/11/2026' })).toBeNull();
  });

  it('acepta pesos creíbles con un decimal', () => {
    expect(deviceWeight({ day: '2026-11-15', weightKg: 76.04 })).toBe(76);
    expect(deviceWeight({ day: '2026-11-15', weightKg: 5 })).toBeNull();
    expect(deviceWeight({ day: '2026-11-15' })).toBeNull();
  });

  it('traduce tipos de Salud al catálogo de Brío', () => {
    expect(deviceTypeCode('runningTreadmill')).toBe('running');
    expect(deviceTypeCode('traditionalStrengthTraining')).toBe('strength');
    expect(deviceTypeCode('curling')).toBeNull();
  });

  it('descarta entrenos sin id o de menos de un minuto', () => {
    const base = {
      id: 'abc',
      workoutType: 'running',
      startDate: '2026-11-15T07:00:00Z',
      endDate: '2026-11-15T07:40:00Z',
      durationSec: 2400,
    };
    expect(deviceWorkoutFrom(base)?.typeCode).toBe('running');
    expect(deviceWorkoutFrom({ ...base, id: ' ' })).toBeNull();
    expect(deviceWorkoutFrom({ ...base, durationSec: 30 })).toBeNull();
  });

  it('reconoce entrenos que vienen de la app de Garmin', () => {
    const w = deviceWorkoutFrom({
      id: 'x',
      workoutType: 'running',
      startDate: '2026-11-15T07:00:00Z',
      endDate: '2026-11-15T07:40:00Z',
      durationSec: 2400,
      sourceName: 'Connect',
      sourceId: 'com.garmin.connect.mobile',
    })!;
    expect(isFromGarmin(w)).toBe(true);
  });

  it('dos entrenos se solapan si comparten la mitad del más corto', () => {
    const a = {
      startedAt: new Date('2026-11-15T07:00:00Z'),
      durationSec: 3600,
    };
    const b = {
      startedAt: new Date('2026-11-15T07:40:00Z'),
      durationSec: 1800,
    };
    const c = {
      startedAt: new Date('2026-11-15T07:50:00Z'),
      durationSec: 3600,
    };
    expect(overlaps(a, b)).toBe(true); // 20 de 30 min
    expect(overlaps(a, c)).toBe(false); // 10 de 60 min
  });

  it('en un día de Garmin solo rellena huecos', () => {
    const incoming = deviceDayFrom({
      day: '2026-11-15',
      steps: 9000,
      sleepSec: 25000,
    })!;
    const existing = {
      ...deviceDayFrom({ day: '2026-11-15', steps: 8000 })!,
      fromGarmin: true,
    };
    expect(mergeDeviceDay(incoming, existing)).toEqual({ sleepSec: 25000 });
    expect(
      mergeDeviceDay(incoming, { ...existing, fromGarmin: false }),
    ).toEqual({ steps: 9000, sleepSec: 25000 });
  });
});
