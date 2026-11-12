import { analyzeMuscles, setStimulus } from './muscle-engine';
import { addDays } from './stats';
import { exercise, session, sets } from './test-helpers';

const TODAY = '2026-11-12';
const bench = exercise('bench', [
  ['CHEST', 1],
  ['TRICEPS', 0.5],
  ['FRONT_DELT', 0.25],
]);
const squat = exercise('squat', [
  ['QUADS', 1],
  ['GLUTES', 1],
]);
const OPTS = { today: TODAY, bodyWeightKg: 80 };

const of = (result: ReturnType<typeof analyzeMuscles>, muscle: string) =>
  result.muscles.find((m) => m.muscle === muscle)!;

describe('setStimulus', () => {
  it('no cuenta el calentamiento', () => {
    expect(setStimulus(sets('bench', [[40, 10]], { warmup: true })[0])).toBe(0);
  });

  it('pesa menos las series lejos del fallo', () => {
    const at = (rir: number | null) =>
      setStimulus(sets('bench', [[70, 8, rir]])[0]);
    expect(at(null)).toBe(1);
    expect(at(2)).toBe(1);
    expect(at(4)).toBe(0.75);
    expect(at(6)).toBe(0.25);
  });

  it('reduce las series de muy pocas o muchísimas repeticiones', () => {
    expect(setStimulus(sets('bench', [[100, 1, 0]])[0])).toBe(0.5);
    expect(setStimulus(sets('bench', [[20, 40, 0]])[0])).toBe(0.5);
  });
});

describe('analyzeMuscles', () => {
  it('reparte series y volumen según el peso de cada músculo', () => {
    const s = session(TODAY, {
      sets: sets('bench', [
        [70, 10, 2],
        [70, 10, 2],
      ]),
    });
    const r = analyzeMuscles([s], [bench], OPTS);
    expect(of(r, 'CHEST').last7).toMatchObject({
      directSets: 2,
      weightedSets: 2,
      effectiveSets: 2,
      volumeKg: 1400,
      sessions: 1,
    });
    expect(of(r, 'TRICEPS').last7).toMatchObject({
      directSets: 0,
      weightedSets: 1,
      volumeKg: 700,
      sessions: 1,
    });
    // Un músculo indirecto suma series, pero la sesión no cuenta como suya.
    expect(of(r, 'FRONT_DELT').last7).toMatchObject({
      weightedSets: 0.5,
      sessions: 0,
    });
    expect(of(r, 'QUADS').last7.weightedSets).toBe(0);
    expect(of(r, 'QUADS').lastTrainedDay).toBeNull();
  });

  it('separa las ventanas de 7, 30 y 90 días', () => {
    const r = analyzeMuscles(
      [
        session(addDays(TODAY, -60), { sets: sets('bench', [[60, 10]]) }),
        session(addDays(TODAY, -20), { sets: sets('bench', [[60, 10]]) }),
        session(addDays(TODAY, -2), { sets: sets('bench', [[60, 10]]) }),
      ],
      [bench],
      OPTS,
    );
    const chest = of(r, 'CHEST');
    expect(chest.last7.directSets).toBe(1);
    expect(chest.last30.directSets).toBe(2);
    expect(chest.last90.directSets).toBe(3);
    expect(chest.lastTrainedDay).toBe(addDays(TODAY, -2));
    expect(chest.daysSinceLast).toBe(2);
    expect(chest.weeklyFrequency).toBe(0.5);
  });

  it('detecta la tendencia de volumen entre bloques de 4 semanas', () => {
    const block = (from: number, load: number) =>
      [0, 7, 14, 21].map((d) =>
        session(addDays(TODAY, -(from + d)), {
          sets: sets('bench', [
            [load, 10],
            [load, 10],
          ]),
        }),
      );
    const up = of(
      analyzeMuscles([...block(29, 50), ...block(1, 70)], [bench], OPTS),
      'CHEST',
    );
    expect(up.volumeTrend).toBe('UP');
    expect(up.volumeChangePct).toBeCloseTo(40, 0);
    expect(up.loadTrend).toBe('UP');

    const only = of(analyzeMuscles(block(1, 70), [bench], OPTS), 'CHEST');
    expect(only.volumeTrend).toBe('INSUFFICIENT_DATA');

    // Con solo 6 semanas de historial el bloque antiguo está incompleto.
    const short = of(
      analyzeMuscles(
        [0, 7, 14, 21, 28, 35].map((d) =>
          session(addDays(TODAY, -d), { sets: sets('bench', [[70, 10]]) }),
        ),
        [bench],
        OPTS,
      ),
      'CHEST',
    );
    expect(short.volumeTrend).toBe('INSUFFICIENT_DATA');
  });

  it('mide cuánto se concentra la semana en una sola sesión', () => {
    const r = analyzeMuscles(
      [
        session(addDays(TODAY, -3), {
          sets: sets('squat', [
            [100, 5],
            [100, 5],
            [100, 5],
          ]),
        }),
        session(addDays(TODAY, -1), { sets: sets('squat', [[100, 5]]) }),
      ],
      [squat],
      OPTS,
    );
    expect(of(r, 'QUADS').maxSessionShare7d).toBe(0.75);
  });

  it('normaliza la carga reciente para el mapa y cuenta lo que no puede repartir', () => {
    const r = analyzeMuscles(
      [
        session(TODAY, {
          sets: [
            ...sets('squat', [
              [100, 5, 1],
              [100, 5, 1],
            ]),
            ...sets('bench', [[70, 8, 2]]),
            ...sets('unknown', [[10, 10]]),
          ],
        }),
      ],
      [bench, squat],
      OPTS,
    );
    expect(of(r, 'QUADS').relativeLoad).toBe(1);
    expect(of(r, 'CHEST').relativeLoad).toBe(0.5);
    expect(of(r, 'LATS').relativeLoad).toBe(0);
    expect(r.unmappedSets).toBe(1);
    expect(r.rirCoverage).toBe(0.75);
  });
});
