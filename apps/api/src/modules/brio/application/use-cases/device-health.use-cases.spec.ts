/* eslint-disable @typescript-eslint/require-await -- dobles de prueba: métodos async sin await */
import type { DailyHealth } from '../../domain/services/garmin';
import type {
  BrioDeviceHealthRepositoryPort,
  DeviceSessionData,
  ExistingSession,
} from '../ports/device-health.port';
import type { BrioGarminRepositoryPort } from '../ports/garmin.port';
import type { BrioBodyRepositoryPort } from '../ports/brio-body-repository.port';
import type { BrioProfileRepositoryPort } from '../ports/brio-profile-repository.port';
import type { ConnectionPrefsPort } from '../ports/connection-prefs.port';
import type { LogWeightUseCase } from './log-weight.use-case';
import type { RefreshDailyLogUseCase } from './refresh-daily-log.use-case';
import { ImportDeviceHealthUseCase } from './device-health.use-cases';

const USER = 'u1';
const NOW = new Date('2026-11-16T08:00:00Z');

function setup(
  opts: {
    garmin?: boolean;
    others?: ExistingSession[];
    health?: Map<string, DailyHealth & { fromGarmin: boolean }>;
    weighed?: string[];
    prefs?: { importActivities: boolean; importHealth: boolean };
  } = {},
) {
  const saved = new Map<string, Partial<DailyHealth>>();
  const sessions = new Map<string, DeviceSessionData>();
  const weights: { day: string; kg: number }[] = [];
  const refreshed: string[] = [];
  let sync: unknown = null;

  const repo: BrioDeviceHealthRepositoryPort = {
    getDevice: async () => null,
    saveSync: async (_u, platform, d) => {
      sync = { platform, ...d };
    },
    deleteDevice: async () => {},
    hasGarmin: async () => !!opts.garmin,
    healthDays: async () => opts.health ?? new Map(),
    saveHealthDay: async (_u, _p, day, values) => {
      saved.set(day, values);
    },
    sessionsBetween: async () => opts.others ?? [],
    upsertSession: async (_u, _p, id, d) => {
      const created = !sessions.has(id);
      sessions.set(id, d);
      return { created, previousDay: null };
    },
    weighedDays: async () => new Set(opts.weighed ?? []),
  };
  const types = {
    typeByCode: async (code: string) =>
      ({
        running: { id: 'T-run', met: 9.8 },
        strength: { id: 'T-str', met: 5 },
      })[code] ?? null,
    ensureOtherType: async () => ({ id: 'T-other', met: 5 }),
    hevyDays: async () => new Set<string>(),
  } as unknown as BrioGarminRepositoryPort;
  const body = {
    latestWeightKg: async () => 76,
  } as unknown as BrioBodyRepositoryPort;
  const profiles = {
    findByUserId: async () => ({ timezone: 'Europe/Madrid' }),
  } as unknown as BrioProfileRepositoryPort;
  const prefs = {
    get: async () => ({
      importActivities: true,
      importHealth: true,
      exerciseKcalSharePct: 100,
      ...opts.prefs,
    }),
  } as unknown as ConnectionPrefsPort;
  const refresh = {
    execute: async (_u: string, day: string) => {
      refreshed.push(day);
    },
  } as unknown as RefreshDailyLogUseCase;
  const logWeight = {
    execute: async (i: { measuredOn: string; weightKg: number }) => {
      weights.push({ day: i.measuredOn, kg: i.weightKg });
    },
  } as unknown as LogWeightUseCase;

  const useCase = new ImportDeviceHealthUseCase(
    repo,
    types,
    body,
    profiles,
    prefs,
    refresh,
    logWeight,
  );
  return {
    useCase,
    saved,
    sessions,
    weights,
    refreshed,
    sync: () => sync,
  };
}

const run = (id: string, start: string, min: number, extra = {}) => ({
  id,
  workoutType: 'running',
  startDate: start,
  endDate: new Date(new Date(start).getTime() + min * 60_000).toISOString(),
  durationSec: min * 60,
  ...extra,
});

describe('ImportDeviceHealthUseCase', () => {
  it('guarda salud, peso y entrenos, y apunta la sincronización', async () => {
    const t = setup();
    const r = await t.useCase.execute(
      USER,
      {
        platform: 'ios',
        days: [
          { day: '2026-11-15', steps: 9000, sleepSec: 26000, weightKg: 76.2 },
        ],
        workouts: [run('w1', '2026-11-15T07:00:00Z', 40, { kcal: 420 })],
      },
      NOW,
    );
    expect(r).toEqual({
      healthDays: 1,
      weights: 1,
      imported: 1,
      updated: 0,
      skipped: 0,
    });
    expect(t.saved.get('2026-11-15')).toEqual({ steps: 9000, sleepSec: 26000 });
    expect(t.weights).toEqual([{ day: '2026-11-15', kg: 76.2 }]);
    expect(t.sessions.get('w1')).toMatchObject({
      activityTypeId: 'T-run',
      loggedOn: '2026-11-15',
      kcalBurned: 420,
    });
    expect(t.refreshed).toEqual(['2026-11-15']);
    expect(t.sync()).toEqual({
      platform: 'ios',
      lastSyncAt: NOW,
      lastSyncDays: 1,
      lastSyncWorkouts: 1,
    });
  });

  it('no duplica un entreno que ya está por otra fuente', async () => {
    const t = setup({
      others: [
        {
          externalId: 'garmin-1',
          fromDevice: false,
          startedAt: new Date('2026-11-15T07:02:00Z'),
          durationSec: 2400,
        },
      ],
    });
    const r = await t.useCase.execute(
      USER,
      {
        platform: 'ios',
        days: [],
        workouts: [run('w1', '2026-11-15T07:00:00Z', 40)],
      },
      NOW,
    );
    expect(r.skipped).toBe(1);
    expect(t.sessions.size).toBe(0);
  });

  it('con Garmin conectado ignora los entrenos que la app de Garmin vuelca en Salud', async () => {
    const t = setup({ garmin: true });
    const r = await t.useCase.execute(
      USER,
      {
        platform: 'ios',
        days: [],
        workouts: [
          run('w1', '2026-11-15T07:00:00Z', 40, {
            sourceId: 'com.garmin.connect.mobile',
          }),
        ],
      },
      NOW,
    );
    expect(r.skipped).toBe(1);
  });

  it('actualiza un entreno que ya trajo el propio móvil', async () => {
    const t = setup({
      others: [
        {
          externalId: 'w1',
          fromDevice: true,
          startedAt: new Date('2026-11-15T07:00:00Z'),
          durationSec: 2400,
        },
      ],
    });
    const r = await t.useCase.execute(
      USER,
      {
        platform: 'ios',
        days: [],
        workouts: [run('w1', '2026-11-15T07:00:00Z', 40)],
      },
      NOW,
    );
    expect(r.skipped).toBe(0);
    expect(r.imported).toBe(1);
  });

  it('no pisa el peso ya apuntado ese día ni los datos de Garmin', async () => {
    const t = setup({
      weighed: ['2026-11-15'],
      health: new Map([
        [
          '2026-11-15',
          {
            day: '2026-11-15',
            steps: 8000,
            restingHr: 52,
            sleepSec: null,
            deepSleepSec: null,
            remSleepSec: null,
            awakeSec: null,
            sleepScore: 80,
            hrvMs: 50,
            stressAvg: 30,
            bodyBatteryMax: 90,
            fromGarmin: true,
          },
        ],
      ]),
    });
    const r = await t.useCase.execute(
      USER,
      {
        platform: 'android',
        days: [
          {
            day: '2026-11-15',
            steps: 9500,
            restingHr: 55,
            sleepSec: 25000,
            weightKg: 77,
          },
        ],
        workouts: [],
      },
      NOW,
    );
    expect(t.saved.get('2026-11-15')).toEqual({ sleepSec: 25000 });
    expect(r.weights).toBe(0);
  });

  it('respeta lo que el usuario ha apagado en Conexiones', async () => {
    const t = setup({ prefs: { importActivities: false, importHealth: true } });
    const r = await t.useCase.execute(
      USER,
      {
        platform: 'ios',
        days: [{ day: '2026-11-15', steps: 9000 }],
        workouts: [run('w1', '2026-11-15T07:00:00Z', 40)],
      },
      NOW,
    );
    expect(r.healthDays).toBe(1);
    expect(r.imported).toBe(0);
    expect(t.sessions.size).toBe(0);
  });
});
