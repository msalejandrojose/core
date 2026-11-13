import type { TrainingSession } from '../../entities/performance.entity';
import {
  analyzeFatigue,
  sessionLoad,
  sessionRpe,
  trimp,
} from './fatigue-engine';
import { analyzeMuscles } from './muscle-engine';
import { addDays } from './stats';
import { exercise, session, sets } from './test-helpers';

const TODAY = '2026-11-12';
const NOW = new Date('2026-11-12T20:00:00.000Z');
const OPTS = { today: TODAY, now: NOW, sex: 'MALE' as const };
const HEART = {
  maxHr: 190,
  restingHr: 50,
  method: 'HR_RESERVE' as const,
  customZones: null,
};
const bench = exercise('bench', [['CHEST', 1]]);
const row = exercise('row', [['LATS', 1]]);
const noMuscles = analyzeMuscles([], [], { today: TODAY, bodyWeightKg: null });

const day = (ago: number, data: Partial<TrainingSession> = {}) =>
  session(addDays(TODAY, -ago), { durationSec: 3600, ...data });

describe('carga de sesión', () => {
  it('usa el RPE apuntado y lo multiplica por los minutos', () => {
    const s = day(0, { rpe: 7 });
    expect(sessionRpe(s)).toEqual({ value: 7, source: 'RECORDED' });
    expect(sessionLoad(s)).toBe(420);
  });

  it('deduce el RPE del registro rápido o del RIR, y lo marca como estimado', () => {
    expect(sessionRpe(day(0, { effort: 'VIGOROUS' }))).toEqual({
      value: 8,
      source: 'ESTIMATED',
    });
    expect(sessionRpe(day(0, { sets: sets('bench', [[70, 8, 2]]) }))).toEqual({
      value: 8,
      source: 'ESTIMATED',
    });
  });

  it('sin ningún dato de esfuerzo no inventa carga', () => {
    expect(sessionRpe(day(0))).toBeNull();
    expect(sessionLoad(day(0))).toBeNull();
  });

  it('calcula el TRIMP solo con FC media, máxima y en reposo', () => {
    const s = day(0, { kind: 'RUN', avgHeartRate: 150 });
    // FCr = (150 − 50) / 140 = 0,714 → 60 × 0,714 × 0,64 × e^(1,92 × 0,714)
    expect(trimp(s, HEART, 'MALE')).toBeCloseTo(108, 0);
    expect(trimp(s, { ...HEART, restingHr: null }, 'MALE')).toBeNull();
    expect(trimp(day(0, { kind: 'RUN' }), HEART, 'MALE')).toBeNull();
  });
});

describe('analyzeFatigue', () => {
  it('sin 28 días de historial no compara con la carga habitual', () => {
    const f = analyzeFatigue(
      [day(3, { rpe: 6 }), day(1, { rpe: 6 })],
      null,
      noMuscles,
      OPTS,
    );
    expect(f.load.ratio).toBeNull();
    expect(f.load.status).toBe('INSUFFICIENT_DATA');
    expect(f.estimatedRecovery.status).toBe('INSUFFICIENT_DATA');
    expect(f.load.last7).toBe(720);
  });

  it('detecta una carga reciente por encima de la habitual', () => {
    // Seis semanas a 3 sesiones moderadas y una última semana con 6 duras.
    const base = Array.from({ length: 18 }, (_, i) =>
      day(8 + Math.floor(i / 3) * 7 + (i % 3) * 2, { rpe: 5 }),
    );
    const spike = [0, 1, 2, 3, 4, 5].map((d) => day(d, { rpe: 9 }));
    const f = analyzeFatigue([...base, ...spike], null, noMuscles, OPTS);
    expect(f.load.ratio).toBeGreaterThan(1.5);
    expect(f.load.status).toBe('WELL_ABOVE_USUAL');
    expect(f.demanding.last7).toBe(6);
    expect(f.demanding.maxConsecutiveDays).toBe(6);
    expect(f.rest.restDaysLast7).toBe(1);
    expect(f.rest.currentStreakDays).toBe(6);
    expect(f.estimatedRecovery.status).toBe('HIGH_LOAD');
    expect(f.estimatedRecovery.source).toBe('ESTIMATED');
    expect(f.load.weekChangePct).toBeGreaterThan(100);
  });

  it('con carga estable la lectura es normal', () => {
    const steady = Array.from({ length: 18 }, (_, i) =>
      day(Math.floor(i / 3) * 7 + (i % 3) * 2, { rpe: 6 }),
    );
    const f = analyzeFatigue(steady, null, noMuscles, OPTS);
    expect(f.load.status).toBe('USUAL');
    expect(f.estimatedRecovery.status).toBe('NORMAL');
    expect(f.load.monotony).not.toBeNull();
  });

  it('las horas entre sesiones nunca son negativas aunque se solapen', () => {
    const f = analyzeFatigue(
      [day(1, { rpe: 5 }), day(1, { rpe: 5 })],
      null,
      noMuscles,
      OPTS,
    );
    expect(f.rest.minHoursBetweenSessions).toBe(0);
  });

  it('cuenta la calidad de los datos de esfuerzo', () => {
    const f = analyzeFatigue(
      [day(2, { rpe: 6 }), day(1, { effort: 'LIGHT' }), day(0)],
      null,
      noMuscles,
      OPTS,
    );
    expect(f.dataQuality).toMatchObject({
      sessions: 3,
      withRecordedRpe: 1,
      withEstimatedRpe: 1,
      withoutLoad: 1,
    });
  });

  it('da el TRIMP aparte y solo si hay configuración cardíaca', () => {
    const runs = [
      day(1, { kind: 'RUN', avgHeartRate: 150 }),
      day(2, { kind: 'RUN' }),
    ];
    expect(analyzeFatigue(runs, null, noMuscles, OPTS).cardioLoad).toBeNull();
    const f = analyzeFatigue(runs, HEART, noMuscles, OPTS);
    expect(f.cardioLoad).toMatchObject({
      sessionsWithTrimp: 1,
      sessionsWithoutHr: 1,
    });
    expect(f.cardioLoad!.last7).toBeCloseTo(108, 0);
  });

  it('señala desequilibrios de empuje y tirón y músculos sin trabajar', () => {
    const sessions = [
      day(2, {
        sets: sets('bench', [
          [70, 8],
          [70, 8],
          [70, 8],
          [70, 8],
        ]),
      }),
      day(1, {
        sets: sets('row', [
          [60, 8],
          [60, 8],
        ]),
      }),
    ];
    const muscles = analyzeMuscles(sessions, [bench, row], {
      today: TODAY,
      bodyWeightKg: 80,
    });
    const f = analyzeFatigue(sessions, null, muscles, OPTS);
    expect(f.imbalances.pushPullRatio).toBe(2);
    expect(f.imbalances.upperLowerRatio).toBeNull();
    expect(f.imbalances.neglected.map((n) => n.muscle)).toContain('QUADS');
    expect(f.imbalances.neglected.map((n) => n.muscle)).not.toContain('CHEST');
  });
});
