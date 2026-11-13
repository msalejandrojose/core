/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method -- dobles de prueba: métodos async sin await y mocks de jest */
import { BadRequestException } from '@nestjs/common';
import type { DailyHealth } from '../../domain/services/garmin';
import {
  GarminApiError,
  type GarminClientPort,
  type GarminConnection,
  type GarminSessionData,
  type RitmoGarminRepositoryPort,
} from '../ports/garmin.port';
import {
  ConnectGarminUseCase,
  GetRecentHealthUseCase,
  SyncGarminUseCase,
} from './garmin.use-cases';

const USER = 'u1';
const NOW = new Date('2026-11-13T10:00:00Z');
const cipher = {
  encrypt: (s: string) => `enc(${s})`,
  decrypt: (s: string) => s.replace(/^enc\((.*)\)$/, '$1'),
};
const profiles = { findByUserId: async () => ({ timezone: 'Europe/Madrid' }) };

function fakes(initial: Partial<GarminConnection> | null = {}) {
  let conn: GarminConnection | null = initial
    ? {
        apiKeyEnc: 'enc(KEY)',
        lastSyncAt: null,
        lastSyncCount: null,
        lastError: null,
        ...initial,
      }
    : null;
  const imported = new Map<string, GarminSessionData>();
  const health = new Map<string, DailyHealth>();
  let hevy = new Set<string>();
  let otherTypes = 0;
  let prefs = {
    importActivities: true,
    importHealth: true,
    exerciseKcalSharePct: 100,
  };

  const repo: RitmoGarminRepositoryPort = {
    getConnection: async () => conn,
    saveConnection: async (_u, apiKeyEnc) => {
      conn = {
        apiKeyEnc,
        lastSyncAt: conn?.lastSyncAt ?? null,
        lastSyncCount: null,
        lastError: null,
      };
    },
    deleteConnection: async () => {
      conn = null;
    },
    markSync: async (_u, d) => {
      if (conn) conn = { ...conn, ...d };
    },
    countImported: async () => imported.size,
    typeByCode: async (code) =>
      ({
        running: { id: 'T-run', met: 9.8 },
        strength: { id: 'T-str', met: 5 },
      })[code] ?? null,
    ensureOtherType: async () => {
      otherTypes += 1;
      return { id: 'T-other', met: 5 };
    },
    hevyDays: async () => hevy,
    upsertImported: async (_u, id, d) => {
      const created = !imported.has(id);
      imported.set(id, d);
      return { created, previousDay: null };
    },
    upsertDailyHealth: async (_u, days) => {
      for (const d of days) health.set(d.day, d);
    },
    dailyHealth: async () => [...health.values()],
  };
  const client: jest.Mocked<GarminClientPort> = {
    accessToken: jest.fn().mockResolvedValue('TOKEN'),
    activities: jest.fn().mockResolvedValue([]),
    dailySummaries: jest.fn().mockResolvedValue([]),
    sleep: jest.fn().mockResolvedValue([]),
    hrv: jest.fn().mockResolvedValue([]),
  };
  const refresh = { execute: jest.fn() };
  const sync = new SyncGarminUseCase(
    repo,
    client,
    cipher,
    { latestWeightKg: async () => 80 } as never,
    profiles as never,
    refresh as never,
    { get: async () => prefs } as never,
  );
  return {
    repo,
    setPrefs: (p: Partial<typeof prefs>) => (prefs = { ...prefs, ...p }),
    client,
    sync,
    refresh,
    imported,
    health,
    conn: () => conn,
    setHevy: (days: string[]) => (hevy = new Set(days)),
    otherTypes: () => otherTypes,
  };
}

describe('SyncGarminUseCase', () => {
  it('la primera vez trae los últimos meses de entrenos y salud', async () => {
    const f = fakes();
    f.client.activities.mockResolvedValue([
      {
        activityId: 1,
        activityName: 'Rodaje',
        startTimeGMT: '2026-11-10 06:30:00',
        duration: 3000,
        distance: 10000,
        calories: 640,
        averageHR: 148,
        activityType: { typeKey: 'running' },
      },
      {
        activityId: 2,
        startTimeGMT: '2026-11-11 18:00:00',
        duration: 3600,
        activityType: { typeKey: 'kiteboarding' },
      },
    ]);
    f.client.dailySummaries.mockResolvedValue([
      { calendarDate: '2026-11-12', heartRate: { restingValue: 51 } },
    ]);
    f.client.sleep.mockResolvedValue([
      { calendarDate: '2026-11-12', sleepTimeSeconds: 25_200 },
    ]);

    const r = await f.sync.execute(USER, NOW);

    expect(f.client.accessToken).toHaveBeenCalledWith('KEY');
    expect(f.client.activities).toHaveBeenCalledWith('TOKEN', {
      startDate: '2026-05-17',
      start: 0,
      limit: 100,
    });
    expect(f.client.dailySummaries).toHaveBeenCalledWith(
      'TOKEN',
      '2026-05-17',
      '2026-11-13',
    );
    // 181 días de sueño en tramos de 31.
    expect(f.client.sleep).toHaveBeenCalledTimes(6);
    expect(r).toEqual({ imported: 2, updated: 0, skipped: 0, healthDays: 1 });

    const run = f.imported.get('1')!;
    expect(run).toMatchObject({
      activityTypeId: 'T-run',
      loggedOn: '2026-11-10',
      kcalBurned: 640,
      distanceM: 10000,
      avgHeartRate: 148,
      notes: 'Rodaje',
    });
    // Sin calorías del reloj se estiman; sin tipo equivalente va a "Otra actividad".
    expect(f.imported.get('2')).toMatchObject({
      activityTypeId: 'T-other',
      kcalBurned: 420,
    });
    expect(f.otherTypes()).toBe(1);
    expect(f.health.get('2026-11-12')).toMatchObject({
      restingHr: 51,
      sleepSec: 25_200,
    });
    expect(f.refresh.execute).toHaveBeenCalledWith(USER, '2026-11-10');
    expect(f.conn()?.lastSyncAt).toEqual(NOW);
    expect(f.conn()?.lastSyncCount).toBe(2);
  });

  it('después repasa solo desde unos días antes de la última vez', async () => {
    const f = fakes({ lastSyncAt: new Date('2026-11-12T08:00:00Z') });
    await f.sync.execute(USER, NOW);
    expect(f.client.activities).toHaveBeenCalledWith(
      'TOKEN',
      expect.objectContaining({ startDate: '2026-11-09' }),
    );
    expect(f.client.sleep).toHaveBeenCalledTimes(1);
  });

  it('no duplica la fuerza de un día que ya trajo Hevy', async () => {
    const f = fakes();
    f.setHevy(['2026-11-10']);
    f.client.activities.mockResolvedValue([
      {
        activityId: 1,
        startTimeGMT: '2026-11-10 18:00:00',
        duration: 3600,
        activityType: { typeKey: 'strength_training' },
      },
      {
        activityId: 2,
        startTimeGMT: '2026-11-11 18:00:00',
        duration: 3600,
        activityType: { typeKey: 'strength_training' },
      },
    ]);
    const r = await f.sync.execute(USER, NOW);
    expect(r).toMatchObject({ imported: 1, skipped: 1 });
    expect([...f.imported.keys()]).toEqual(['2']);
  });

  it('pagina hasta agotar los entrenos', async () => {
    const f = fakes();
    const page = (from: number, n: number) =>
      Array.from({ length: n }, (_, i) => ({
        activityId: from + i,
        startTimeGMT: '2026-11-10 06:30:00',
        duration: 600,
        activityType: { typeKey: 'running' },
      }));
    f.client.activities
      .mockResolvedValueOnce(page(1, 100))
      .mockResolvedValueOnce(page(101, 7));
    const r = await f.sync.execute(USER, NOW);
    expect(f.client.activities).toHaveBeenCalledTimes(2);
    expect(f.client.activities).toHaveBeenLastCalledWith(
      'TOKEN',
      expect.objectContaining({ start: 100 }),
    );
    expect(r.imported).toBe(107);
  });

  it('no pide a Garmin lo que el usuario ha apagado', async () => {
    const f = fakes();
    f.setPrefs({ importActivities: false });
    f.client.dailySummaries.mockResolvedValue([
      { calendarDate: '2026-11-12', heartRate: { restingValue: 51 } },
    ]);
    const r = await f.sync.execute(USER, NOW);
    expect(f.client.activities).not.toHaveBeenCalled();
    expect(r).toEqual({ imported: 0, updated: 0, skipped: 0, healthDays: 1 });

    f.setPrefs({ importActivities: true, importHealth: false });
    f.client.dailySummaries.mockClear();
    await f.sync.execute(USER, NOW);
    expect(f.client.dailySummaries).not.toHaveBeenCalled();
    expect(f.client.activities).toHaveBeenCalled();
  });

  it('una clave caducada se explica y queda apuntada', async () => {
    const f = fakes();
    f.client.accessToken.mockRejectedValue(new GarminApiError(401));
    await expect(f.sync.execute(USER, NOW)).rejects.toThrow(
      'RITMO_GARMIN_KEY_INVALID',
    );
    expect(f.conn()?.lastError).toBe('GARMIN_401');
    expect(f.conn()?.lastSyncAt).toBeNull();
  });
});

describe('ConnectGarminUseCase', () => {
  it('comprueba la clave, la guarda cifrada e importa', async () => {
    const f = fakes(null);
    const connect = new ConnectGarminUseCase(f.repo, f.client, cipher, f.sync);
    const r = await connect.execute(USER, '  PERSONAL-KEY-123  ', true);
    expect(f.client.accessToken).toHaveBeenCalledWith('PERSONAL-KEY-123');
    expect(f.conn()?.apiKeyEnc).toBe('enc(PERSONAL-KEY-123)');
    expect(r).toEqual({ imported: 0, updated: 0, skipped: 0, healthDays: 0 });
  });

  it('no guarda una clave que Garmin rechaza', async () => {
    const f = fakes(null);
    f.client.accessToken.mockRejectedValue(new GarminApiError(403));
    const connect = new ConnectGarminUseCase(f.repo, f.client, cipher, f.sync);
    await expect(
      connect.execute(USER, 'BAD-KEY-1234567', true),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(f.conn()).toBeNull();
  });
});

describe('GetRecentHealthUseCase', () => {
  it('devuelve los últimos días y cada métrica frente a su media', async () => {
    const f = fakes();
    const blank = {
      restingHr: null,
      steps: null,
      sleepSec: null,
      deepSleepSec: null,
      remSleepSec: null,
      awakeSec: null,
      sleepScore: null,
      hrvMs: null,
      stressAvg: null,
      bodyBatteryMax: null,
    };
    for (const [d, hrvMs] of [
      [8, 50],
      [9, 50],
      [10, 50],
      [11, 45],
    ] as const)
      f.health.set(`2026-11-${d}`, {
        ...blank,
        day: `2026-11-${String(d).padStart(2, '0')}`,
        hrvMs,
      });
    const r = await new GetRecentHealthUseCase(
      f.repo,
      profiles as never,
    ).execute(USER, NOW);
    expect(r.days).toHaveLength(4);
    expect(r.hrv).toEqual({
      latest: 45,
      baseline: 50,
      deltaPct: -10,
      day: '2026-11-11',
    });
    expect(r.sleep.latest).toBeNull();
  });
});
