import type { TrainingSession } from '../../entities/performance.entity';
import { detectCardioPlateau } from './cardio-engine';
import { analyzeHybrid } from './hybrid-engine';
import { addDays } from './stats';
import { analyzeStrength } from './strength-engine';
import { exercise, session, sets } from './test-helpers';

const TODAY = '2026-11-12';
const squat = exercise('squat', [
  ['QUADS', 1],
  ['GLUTES', 1],
]);
const bench = exercise('bench', [['CHEST', 1]]);
const EXERCISES = [squat, bench];

const at = (ago: number, hour: number, data: Partial<TrainingSession>) =>
  session(addDays(TODAY, -ago), {
    startedAt: new Date(
      `${addDays(TODAY, -ago)}T${String(hour).padStart(2, '0')}:00:00.000Z`,
    ),
    durationSec: 3600,
    ...data,
  });
const legs = (ago: number, hour = 18) =>
  at(ago, hour, {
    rpe: 8,
    sets: sets('squat', [
      [100, 5, 1],
      [100, 5, 1],
      [100, 5, 1],
    ]),
  });
const run = (ago: number, data: Partial<TrainingSession> = {}, hour = 7) =>
  at(ago, hour, {
    kind: 'RUN',
    distanceM: 10000,
    rpe: 5,
    elevationGainM: 20,
    ...data,
  });

function hybrid(sessions: TrainingSession[]) {
  const strength = analyzeStrength(sessions, EXERCISES, {
    today: TODAY,
    bodyWeightKg: 80,
  });
  const plateaus = [detectCardioPlateau(sessions, 'RUN', TODAY)];
  return analyzeHybrid(sessions, EXERCISES, strength, plateaus, TODAY);
}

describe('equilibrio entre disciplinas', () => {
  it('reparte tiempo y carga, y clasifica la intensidad', () => {
    const h = hybrid([legs(1), legs(4), run(2), run(5, { rpe: 3 })]);
    expect(h.balance.strength).toMatchObject({
      sessions: 2,
      minutes: 120,
      load: 960,
    });
    expect(h.balance.cardio).toMatchObject({
      sessions: 2,
      minutes: 120,
      load: 480,
    });
    expect(h.balance.strengthTimeShare).toBe(0.5);
    expect(h.balance.strengthLoadShare).toBe(0.67);
    expect(h.balance.intensity).toEqual({
      easy: 1,
      moderate: 1,
      hard: 2,
      unknown: 0,
    });
    expect(h.balance.flags).toEqual([]);
  });

  it('señala la ausencia prolongada de cardio', () => {
    const h = hybrid([legs(1), legs(4), run(20)]);
    expect(h.balance.daysSinceCardio).toBe(20);
    expect(h.balance.flags).toContain('NO_CARDIO');
  });

  it('señala cuando casi todo es exigente', () => {
    const h = hybrid([
      legs(1),
      legs(3),
      legs(5),
      legs(7),
      run(2, { rpe: 9 }),
      run(6),
    ]);
    expect(h.balance.flags).toContain('MOSTLY_HARD');
    expect(h.balance.flags).toContain('NO_EASY_SESSIONS');
  });
});

describe('carga de tren inferior', () => {
  it('cruza pierna con carrera y lista los esfuerzos demasiado juntos', () => {
    const h = hybrid([
      legs(2, 18),
      run(1, { rpe: 9 }, 7),
      run(0, { rpe: 4, durationSec: 1800, distanceM: 5000 }, 7),
    ]);
    expect(h.lowerBody.events.map((e) => e.type)).toEqual([
      'STRENGTH_LEGS',
      'RUN',
      'RUN',
    ]);
    expect(h.lowerBody.events.map((e) => e.demanding)).toEqual([
      true,
      true,
      false,
    ]);
    expect(h.lowerBody.demandingLast7).toBe(2);
    expect(h.lowerBody.maxConsecutiveDemandingDays).toBe(2);
    expect(h.lowerBody.closePairs).toHaveLength(1);
    expect(h.lowerBody.closePairs[0]).toMatchObject({
      hoursApart: 12,
      mixed: true,
    });
  });

  it('una sesión de torso no cuenta como pierna', () => {
    const h = hybrid([
      at(1, 18, {
        sets: sets('bench', [
          [70, 8],
          [70, 8],
          [70, 8],
          [70, 8],
        ]),
      }),
    ]);
    expect(h.lowerBody.events).toEqual([]);
  });

  it('un rodaje largo cuenta como exigente aunque el RPE sea bajo', () => {
    const h = hybrid([run(1, { rpe: 4, durationSec: 5400, distanceM: 16000 })]);
    expect(h.lowerBody.events[0].demanding).toBe(true);
  });
});

describe('interferencia', () => {
  it('sin semanas suficientes no correlaciona', () => {
    const h = hybrid([legs(1), run(2)]);
    expect(h.interference.cardioLoadVsStrengthPerf.association).toBe(
      'INSUFFICIENT_DATA',
    );
    expect(h.interference.weeks).toHaveLength(12);
    expect(h.interference.caveats[0]).toContain('correlación');
  });

  it('detecta una asociación negativa entre carga de cardio y fuerza', () => {
    // 8 semanas: cuanto más se corre esa semana, peor sale la sentadilla.
    const sessions = Array.from({ length: 8 }, (_, w) => {
      const heavy = w % 2 === 0;
      const strength = at(w * 7 + 1, 18, {
        rpe: 7,
        sets: sets('squat', [[heavy ? 95 : 105, 5, 1]]),
      });
      const runs = Array.from({ length: heavy ? 4 : 1 }, (_, i) =>
        run(w * 7 + 2 + i, { rpe: 6 }),
      );
      return [strength, ...runs];
    }).flat();
    const c = hybrid(sessions).interference.cardioLoadVsStrengthPerf;
    expect(c.pairedWeeks).toBe(8);
    expect(c.r).toBeLessThan(-0.9);
    expect(c.association).toBe('NEGATIVE');
  });
});

describe('evolución híbrida', () => {
  const weeks = (n: number) =>
    Array.from({ length: n }, (_, i) => (n - 1 - i) * 7);

  it('sin datos de una disciplina no emite veredicto', () => {
    expect(hybrid([legs(1)]).evolution.verdict).toBe('INSUFFICIENT_DATA');
  });

  it('detecta que la fuerza sube mientras la carrera retrocede', () => {
    const sessions = weeks(6).flatMap((ago, i) => [
      at(ago + 1, 18, { rpe: 7, sets: sets('squat', [[100 + i * 2.5, 5, 1]]) }),
      // Mismo ritmo, pulsaciones cada vez más altas.
      run(ago + 2, { avgHeartRate: i < 3 ? 146 : 158, durationSec: 3300 }),
    ]);
    const e = hybrid(sessions).evolution;
    expect(e.strength.trend).toBe('UP');
    expect(e.cardio.trend).toBe('DOWN');
    expect(e.cardio.kind).toBe('RUN');
    expect(e.verdict).toBe('STRENGTH_UP_CARDIO_DOWN');
  });

  it('detecta progresión en las dos', () => {
    const sessions = weeks(6).flatMap((ago, i) => [
      at(ago + 1, 18, { rpe: 7, sets: sets('squat', [[100 + i * 2.5, 5, 1]]) }),
      run(ago + 2, { avgHeartRate: 150, durationSec: 3300 - i * 40 }),
    ]);
    expect(hybrid(sessions).evolution.verdict).toBe('BOTH_PROGRESSING');
  });
});
