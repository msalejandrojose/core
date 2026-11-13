import type { TrainingSession } from '../../entities/performance.entity';
import {
  runEngines,
  summarize,
  type PerformanceInput,
} from './performance-engine';
import { reconcile } from './recommendation-state';
import { buildRecommendations } from './recommendations';
import { addDays } from './stats';
import { exercise, session, sets } from './test-helpers';

const TODAY = '2026-11-12';
const squat = exercise('squat', [
  ['QUADS', 1],
  ['GLUTES', 1],
]);
const bench = exercise('bench', [
  ['CHEST', 1],
  ['TRICEPS', 0.5],
]);

function input(
  sessions: TrainingSession[],
  extra: Partial<PerformanceInput> = {},
): PerformanceInput {
  return {
    sessions,
    exercises: [squat, bench],
    heartConfig: null,
    measurements: [],
    bodyWeightKg: 80,
    sex: 'MALE',
    today: TODAY,
    now: new Date(`${TODAY}T20:00:00.000Z`),
    ...extra,
  };
}

const at = (ago: number, hour: number, data: Partial<TrainingSession>) =>
  session(addDays(TODAY, -ago), {
    startedAt: new Date(
      `${addDays(TODAY, -ago)}T${String(hour).padStart(2, '0')}:00:00.000Z`,
    ),
    durationSec: 3600,
    ...data,
  });
const lift = (ago: number, id: string, kg: number, rpe = 7) =>
  at(ago, 18, {
    rpe,
    sets: sets(id, [
      [kg, 5, 1],
      [kg, 5, 1],
      [kg, 5, 1],
    ]),
  });
const run = (ago: number, data: Partial<TrainingSession> = {}) =>
  at(ago, 7, {
    kind: 'RUN',
    distanceM: 10000,
    durationSec: 3300,
    rpe: 5,
    elevationGainM: 20,
    ...data,
  });

const weeks = (n: number) =>
  Array.from({ length: n }, (_, i) => (n - 1 - i) * 7);
const recs = (
  sessions: TrainingSession[],
  extra: Partial<PerformanceInput> = {},
) => {
  const data = input(sessions, extra);
  return buildRecommendations(runEngines(data, '30d'), TODAY);
};
const codes = (list: ReturnType<typeof recs>) => list.map((r) => r.code);

describe('summarize', () => {
  it('sin entrenos devuelve un resumen vacío y dice qué falta', () => {
    const data = input([]);
    const s = summarize(data, runEngines(data, '30d'), '30d');
    expect(s.totals.sessions).toBe(0);
    expect(s.dataQuality.level).toBe('NONE');
    expect(s.indices.consistency.value).toBeNull();
    expect(s.hybrid.verdict).toBe('INSUFFICIENT_DATA');
    expect(s.dataQuality.missing[0]).toContain('Registra entrenos');
  });

  it('acota los totales al periodo y reparte el trabajo muscular', () => {
    const data = input([
      lift(40, 'squat', 100),
      lift(3, 'squat', 100),
      lift(2, 'bench', 70),
      run(1),
    ]);
    const s = summarize(data, runEngines(data, '7d'), '7d');
    expect(s.from).toBe(addDays(TODAY, -6));
    expect(s.totals).toMatchObject({
      sessions: 3,
      strengthSessions: 2,
      cardioSessions: 1,
      workingSets: 6,
      strengthVolumeKg: 100 * 15 + 70 * 15,
      cardioDistanceM: 10000,
      activeDays: 3,
    });
    const share = (m: string) =>
      s.muscleDistribution.find((x) => x.muscle === m)!.share;
    // 3 series: cuádriceps 3, glúteo 3, pectoral 3, tríceps 1,5 → total 10,5.
    expect(share('QUADS')).toBeCloseTo(3 / 10.5, 3);
    expect(share('TRICEPS')).toBeCloseTo(1.5 / 10.5, 3);
    expect(share('LATS')).toBe(0);
    const all = summarize(data, runEngines(data, 'all'), 'all');
    expect(all.from).toBeNull();
    expect(all.totals.sessions).toBe(4);
  });

  it('documenta los índices y conserva las cifras originales', () => {
    const sessions = weeks(9).flatMap((ago, i) => [
      lift(ago + 1, 'squat', 100 + i * 2.5),
      run(ago + 2, { avgHeartRate: 150, durationSec: 3300 - i * 30 }),
    ]);
    const data = input(sessions);
    const s = summarize(data, runEngines(data, '90d'), '90d');
    expect(s.indices.strengthProgress.value).toBe(100);
    expect(s.indices.strengthProgress.inputs).toMatchObject({ progressing: 1 });
    expect(s.indices.cardioProgress.value).toBeGreaterThan(50);
    expect(s.indices.loadBalance.value).toBeGreaterThan(70);
    expect(s.indices.consistency.value).toBe(100);
    expect(s.indices.loadBalance.formula).toContain('carga reciente');
    expect(s.strength.records[0]).toMatchObject({ name: 'squat' });
    expect(s.hybrid.verdict).toBe('BOTH_PROGRESSING');
    expect(s.dataQuality.level).toBe('HIGH');
    expect(s.plateaus).toEqual([]);
  });

  it('lista los estancamientos de fuerza y de cardio', () => {
    const sessions = weeks(6).flatMap((ago) => [
      lift(ago + 1, 'squat', 100),
      run(ago + 2, { avgHeartRate: 150 }),
    ]);
    const data = input(sessions);
    const s = summarize(data, runEngines(data, '90d'), '90d');
    expect(s.plateaus.map((p) => [p.discipline, p.status])).toEqual([
      ['STRENGTH', 'POTENTIAL_PLATEAU'],
      ['CARDIO', 'POTENTIAL_PLATEAU'],
    ]);
    expect(s.plateaus[1].name).toBe('Carrera');
  });
});

describe('buildRecommendations', () => {
  it('sin datos no recomienda nada', () => {
    expect(recs([])).toEqual([]);
  });

  it('avisa del estancamiento con los datos que lo justifican', () => {
    const list = recs(weeks(6).map((ago) => lift(ago + 1, 'squat', 100)));
    const r = list.find((x) => x.code === 'STRENGTH_PLATEAU')!;
    expect(r.id).toBe('STRENGTH_PLATEAU:squat');
    expect(r).toMatchObject({ category: 'STRENGTH', priority: 'MEDIUM' });
    expect(r.data).toMatchObject({ sessions: 6, changePct: 0 });
    expect(r.period).toEqual({ from: addDays(TODAY, -56), to: TODAY });
    expect(r.explanation).toContain('6 sesiones');
  });

  it('prioriza el retroceso y lo ordena primero', () => {
    const list = recs(
      [95, 96, 95, 94, 91, 90, 89, 88].map((kg, i) =>
        lift((7 - i) * 7 + 1, 'squat', kg),
      ),
    );
    expect(list[0]).toMatchObject({
      code: 'STRENGTH_REGRESSION',
      priority: 'HIGH',
    });
  });

  it('celebra la progresión sin pedir nada', () => {
    const list = recs(
      weeks(6).map((ago, i) => lift(ago + 1, 'squat', 100 + i * 2.5)),
    );
    expect(list.find((x) => x.code === 'STRENGTH_PROGRESS')?.priority).toBe(
      'INFO',
    );
  });

  it('detecta esfuerzos de pierna encadenados', () => {
    const list = recs([
      lift(2, 'squat', 100, 8),
      run(1, { rpe: 9 }),
      run(0, { rpe: 8 }),
    ]);
    const r = list.find((x) => x.code === 'LOWER_BODY_STACKING')!;
    expect(r.priority).toBe('HIGH');
    expect(r.data).toMatchObject({ maxConsecutiveDemandingDays: 3 });
  });

  it('señala volumen concentrado, ausencia de cardio y desequilibrio', () => {
    const big = at(2, 18, {
      rpe: 7,
      sets: sets(
        'bench',
        Array.from({ length: 9 }, () => [70, 8, 2] as [number, number, number]),
      ),
    });
    const list = recs([
      big,
      lift(9, 'bench', 70),
      lift(16, 'bench', 70),
      lift(23, 'bench', 70),
    ]);
    expect(codes(list)).toEqual(
      expect.arrayContaining([
        'MUSCLE_VOLUME_CONCENTRATED',
        'NO_CARDIO',
        'MUSCLES_NEGLECTED',
      ]),
    );
    expect(list.find((x) => x.code === 'MUSCLE_VOLUME_CONCENTRATED')?.id).toBe(
      'MUSCLE_VOLUME_CONCENTRATED:CHEST',
    );
  });

  it('avisa de un pico de carga', () => {
    const base = Array.from({ length: 18 }, (_, i) =>
      run(8 + Math.floor(i / 3) * 7 + (i % 3) * 2, { rpe: 5 }),
    );
    const spike = [0, 1, 2, 3, 4, 5].map((d) => run(d, { rpe: 9 }));
    const r = recs([...base, ...spike]).find((x) => x.code === 'LOAD_SPIKE')!;
    expect(r.priority).toBe('HIGH');
    expect(r.data.ratio).toBeGreaterThan(1.5);
  });

  it('pide los datos que faltan', () => {
    const noRpe = weeks(6).map((ago) =>
      at(ago + 1, 18, {
        sets: sets('squat', [
          [100, 5],
          [100, 5],
        ]),
      }),
    );
    expect(codes(recs(noRpe))).toEqual(
      expect.arrayContaining(['LOG_RPE', 'LOG_RIR']),
    );
    expect(codes(recs([run(1, { avgHeartRate: 150 })]))).toContain(
      'SET_HEART_CONFIG',
    );
  });

  it('no usa lenguaje médico', () => {
    const everything = [
      ...recs(weeks(6).map((ago) => lift(ago + 1, 'squat', 100))),
      ...recs([
        lift(2, 'squat', 100, 8),
        run(1, { rpe: 9 }),
        run(0, { rpe: 8 }),
      ]),
    ];
    for (const r of everything) {
      expect(`${r.title} ${r.explanation}`).not.toMatch(
        /lesi[oó]n|diagn[oó]stic|m[eé]dic|enfermedad/i,
      );
    }
  });
});

describe('reconcile', () => {
  it('registra las nuevas con la fecha de hoy', () => {
    expect(reconcile([], ['A'], TODAY)).toEqual([
      { key: 'A', status: 'ACTIVE', firstDetectedOn: TODAY, lastSeenOn: TODAY },
    ]);
  });

  it('conserva la fecha y el descarte mientras siga cumpliéndose', () => {
    const stored = [
      {
        key: 'A',
        status: 'DISMISSED' as const,
        firstDetectedOn: '2026-11-01',
        lastSeenOn: '2026-11-10',
      },
    ];
    expect(reconcile(stored, ['A'], TODAY)).toEqual([
      {
        key: 'A',
        status: 'DISMISSED',
        firstDetectedOn: '2026-11-01',
        lastSeenOn: TODAY,
      },
    ]);
  });

  it('resuelve las que ya no se cumplen y las reabre como nuevas si vuelven', () => {
    const stored = [
      {
        key: 'A',
        status: 'DISMISSED' as const,
        firstDetectedOn: '2026-11-01',
        lastSeenOn: '2026-11-10',
      },
    ];
    const resolved = reconcile(stored, [], TODAY);
    expect(resolved[0].status).toBe('RESOLVED');
    expect(reconcile(resolved, ['A'], '2026-12-01')[0]).toEqual({
      key: 'A',
      status: 'ACTIVE',
      firstDetectedOn: '2026-12-01',
      lastSeenOn: '2026-12-01',
    });
  });
});
