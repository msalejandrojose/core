import {
  activityFrom,
  againstBaseline,
  dayRanges,
  mergeDailyHealth,
  parseGmt,
  typeCodeFor,
  type DailyHealth,
} from './garmin';

describe('garmin: entrenos', () => {
  it('lee la fecha de Garmin como UTC', () => {
    expect(parseGmt('2026-08-31 22:01:18')?.toISOString()).toBe(
      '2026-08-31T22:01:18.000Z',
    );
    expect(parseGmt('nope')).toBeNull();
    expect(parseGmt(null)).toBeNull();
  });

  it('traduce el tipo de actividad al catálogo de Ritmo', () => {
    expect(
      typeCodeFor({
        activityId: 1,
        activityType: { typeKey: 'trail_running' },
      }),
    ).toBe('running');
    expect(
      typeCodeFor({
        activityId: 1,
        activityType: { typeKey: 'indoor_cycling' },
      }),
    ).toBe('cycling');
    expect(
      typeCodeFor({
        activityId: 1,
        activityType: { typeKey: 'strength_training' },
      }),
    ).toBe('strength');
    expect(
      typeCodeFor({ activityId: 1, activityType: { typeKey: 'kiteboarding' } }),
    ).toBeNull();
    expect(typeCodeFor({ activityId: 1 })).toBeNull();
  });

  it('convierte un entreno con sus medidas', () => {
    expect(
      activityFrom({
        activityId: 987,
        activityName: '  Rodaje por el río ',
        startTimeGMT: '2026-11-10 06:30:00',
        duration: 3012.4,
        distance: 10023.7,
        elevationGain: 84.2,
        calories: 640.3,
        averageHR: 148.6,
        maxHR: 171,
        averageRunningCadenceInStepsPerMinute: 172.4,
        hrTimeInZone_1: 60,
        hrTimeInZone_2: 1500.4,
        hrTimeInZone_3: 1200,
        hrTimeInZone_4: 252,
        hrTimeInZone_5: null,
      }),
    ).toEqual({
      externalId: '987',
      startedAt: new Date('2026-11-10T06:30:00Z'),
      durationSec: 3012,
      distanceM: 10024,
      avgHeartRate: 149,
      maxHeartRate: 171,
      elevationGainM: 84,
      cadence: 172,
      zoneSeconds: [60, 1500, 1200, 252, 0],
      kcal: 640,
      notes: 'Rodaje por el río',
    });
  });

  it('deja en blanco lo que el reloj no midió y descarta lo inservible', () => {
    const a = activityFrom({
      activityId: 5,
      startTimeGMT: '2026-11-10 06:30:00',
      duration: 1800,
    });
    expect(a).toMatchObject({
      distanceM: null,
      avgHeartRate: null,
      zoneSeconds: null,
      kcal: null,
      notes: null,
    });
    expect(
      activityFrom({ activityId: 5, startTimeGMT: '2026-11-10 06:30:00' }),
    ).toBeNull();
    expect(activityFrom({ activityId: 5, duration: 100 })).toBeNull();
  });
});

describe('garmin: salud diaria', () => {
  it('junta resumen, sueño y variabilidad por día', () => {
    const days = mergeDailyHealth(
      [
        {
          calendarDate: '2026-11-10',
          movement: { steps: { value: 9120 } },
          heartRate: { restingValue: 52 },
          stress: { avgLevel: 31 },
          bodyBattery: { maxValue: 88 },
        },
        { calendarDate: '2026-11-11' },
      ],
      [
        {
          calendarDate: '2026-11-10',
          sleepTimeSeconds: 26_400,
          deepSleepSeconds: 5400,
          remSleepSeconds: 6000,
          awakeSleepSeconds: 900,
          sleepScores: { overall: { value: 81 } },
        },
      ],
      [
        { calendarDate: '2026-11-09', lastNightAvg: 47 },
        { calendarDate: '2026-11-10', lastNightAvg: 44 },
      ],
    );
    expect(days.map((d) => d.day)).toEqual(['2026-11-09', '2026-11-10']);
    expect(days[1]).toEqual({
      day: '2026-11-10',
      restingHr: 52,
      steps: 9120,
      sleepSec: 26_400,
      deepSleepSec: 5400,
      remSleepSec: 6000,
      awakeSec: 900,
      sleepScore: 81,
      hrvMs: 44,
      stressAvg: 31,
      bodyBatteryMax: 88,
    });
    expect(days[0].hrvMs).toBe(47);
    expect(days[0].sleepSec).toBeNull();
  });

  it('parte un rango en tramos del tamaño pedido', () => {
    expect(dayRanges('2026-10-01', '2026-11-05', 31)).toEqual([
      { from: '2026-10-01', to: '2026-10-31' },
      { from: '2026-11-01', to: '2026-11-05' },
    ]);
    expect(dayRanges('2026-11-05', '2026-11-05', 31)).toEqual([
      { from: '2026-11-05', to: '2026-11-05' },
    ]);
    expect(dayRanges('2026-11-06', '2026-11-05', 31)).toEqual([]);
  });

  const day = (n: number, hrvMs: number | null): DailyHealth => ({
    day: `2026-11-${String(n).padStart(2, '0')}`,
    restingHr: null,
    steps: null,
    sleepSec: null,
    deepSleepSec: null,
    remSleepSec: null,
    awakeSec: null,
    sleepScore: null,
    hrvMs,
    stressAvg: null,
    bodyBatteryMax: null,
  });

  it('compara el último valor con la media de los días anteriores', () => {
    const r = againstBaseline(
      [day(1, 50), day(2, 50), day(3, null), day(4, 50), day(5, 40)],
      (d) => d.hrvMs,
    );
    expect(r).toEqual({
      latest: 40,
      baseline: 50,
      deltaPct: -20,
      day: '2026-11-05',
    });
  });

  it('no compara con menos de tres días de referencia', () => {
    expect(againstBaseline([day(1, 50), day(2, 40)], (d) => d.hrvMs)).toEqual({
      latest: 40,
      baseline: null,
      deltaPct: null,
      day: '2026-11-02',
    });
    expect(againstBaseline([day(1, null)], (d) => d.hrvMs).latest).toBeNull();
  });
});
