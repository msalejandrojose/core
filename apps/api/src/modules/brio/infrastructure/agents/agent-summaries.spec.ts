import type { Progress } from '../../application/use-cases/get-progress.use-case';
import { summarizeHealth, summarizeProgress } from './agent-summaries';

const log = (day: string, kcalIn: number, kcalTarget: number | null) => ({
  userId: 'u',
  logDate: day,
  kcalIn,
  kcalBurned: 0,
  kcalTarget,
  proteinG: 100,
  carbsG: 0,
  fatG: 0,
  steps: null,
  waterMl: null,
  weightKg: null,
});

describe('resúmenes para los agentes', () => {
  it('resume peso, comida frente al objetivo y entrenos', () => {
    const p: Progress = {
      from: '2026-11-01',
      to: '2026-11-07',
      measurements: [
        {
          id: '2',
          userId: 'u',
          measuredOn: '2026-11-07',
          weightKg: 79.4,
          bodyFatPct: null,
          waistCm: null,
          notes: null,
        },
        {
          id: '1',
          userId: 'u',
          measuredOn: '2026-11-01',
          weightKg: 80.2,
          bodyFatPct: null,
          waistCm: null,
          notes: null,
        },
      ],
      logs: [
        log('2026-11-01', 2000, 2000),
        log('2026-11-02', 2400, 2000),
        log('2026-11-03', 0, 2000),
      ],
      sessions: [
        { day: '2026-11-02', sessions: 1, minutes: 45 },
        { day: '2026-11-05', sessions: 2, minutes: 80 },
      ],
      meals: [],
    };
    expect(summarizeProgress(p)).toEqual({
      from: '2026-11-01',
      to: '2026-11-07',
      weight: {
        first: { day: '2026-11-01', kg: 80.2 },
        last: { day: '2026-11-07', kg: 79.4 },
        changeKg: -0.8,
        measurements: 2,
      },
      food: {
        daysLogged: 2,
        kcalAvg: 2200,
        kcalTargetAvg: 2000,
        proteinAvgG: 100,
        daysOverTarget: 1,
      },
      training: { daysTrained: 2, sessions: 3, minutes: 125 },
    });
  });

  it('pasa el sueño a horas y dice si hay reloj conectado', () => {
    const out = summarizeHealth({
      days: [
        {
          day: '2026-11-07',
          restingHr: 52,
          steps: 9000,
          sleepSec: 27000,
          deepSleepSec: 5400,
          remSleepSec: null,
          awakeSec: null,
          sleepScore: 80,
          hrvMs: 60,
          stressAvg: 25,
          bodyBatteryMax: 90,
        },
      ],
      sleep: null,
      hrv: null,
      restingHr: null,
    } as never);
    expect(out.connected).toBe(true);
    expect(out.days[0]).toMatchObject({
      sleepH: 7.5,
      deepSleepH: 1.5,
      restingHr: 52,
    });
  });
});
