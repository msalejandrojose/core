import {
  analyzeStrength,
  detectPlateau,
  estimateE1rm,
  type ExerciseSessionPoint,
} from './strength-engine';
import { addDays } from './stats';
import { exercise, session, sets } from './test-helpers';

const TODAY = '2026-11-12';
const bench = exercise('bench', [
  ['CHEST', 1],
  ['TRICEPS', 0.5],
]);
const pullUp = exercise('pull_up', [['LATS', 1]], { bodyweight: true });

/** Historial de un ejercicio: una sesión por semana con el e1RM indicado. */
function weekly(values: number[], endDay = TODAY): ExerciseSessionPoint[] {
  return values.map((e1rm, i) => ({
    sessionId: `p${i}`,
    day: addDays(endDay, -7 * (values.length - 1 - i)),
    workingSets: 3,
    totalReps: 24,
    volumeKg: 1680,
    topWeightKg: 70,
    maxReps: 8,
    avgRepsPerSet: 8,
    avgRir: 2,
    e1rm,
    bestSet: null,
  }));
}

describe('estimateE1rm', () => {
  it('una repetición al fallo es la marca real', () => {
    expect(estimateE1rm(100, 1, 0)).toMatchObject({
      value: 100,
      formula: 'ACTUAL',
    });
  });

  it('usa Brzycki hasta 10 repeticiones al fallo', () => {
    const e = estimateE1rm(80, 5, 0);
    expect(e?.formula).toBe('BRZYCKI');
    expect(e?.value).toBeCloseTo(90, 1);
  });

  it('usa Epley en 11–12 repeticiones', () => {
    const e = estimateE1rm(60, 12, 0);
    expect(e?.formula).toBe('EPLEY');
    expect(e?.value).toBeCloseTo(84, 1);
  });

  it('suma el RIR a las repeticiones', () => {
    expect(estimateE1rm(80, 3, 2)?.value).toBeCloseTo(
      estimateE1rm(80, 5, 0)!.value,
      5,
    );
    expect(estimateE1rm(80, 3, 2)?.rirKnown).toBe(true);
    expect(estimateE1rm(80, 3, null)?.rirKnown).toBe(false);
  });

  it('no extrapola series largas ni cargas nulas', () => {
    expect(estimateE1rm(40, 20, 0)).toBeNull();
    expect(estimateE1rm(60, 10, 3)).toBeNull();
    expect(estimateE1rm(0, 8, 0)).toBeNull();
  });
});

describe('detectPlateau', () => {
  it('sin sesiones suficientes no clasifica', () => {
    const r = detectPlateau(weekly([90, 91, 92]), TODAY);
    expect(r.status).toBe('INSUFFICIENT_DATA');
    expect(r.signals).toEqual(['TOO_FEW_SESSIONS']);
  });

  it('con muchas sesiones en pocos días tampoco', () => {
    const points = weekly([90, 90, 90, 90, 90]).map((p, i) => ({
      ...p,
      day: addDays(TODAY, -4 + i),
    }));
    expect(detectPlateau(points, TODAY).signals).toEqual(['TOO_SHORT_SPAN']);
  });

  it('detecta progresión cuando sube la mediana', () => {
    const r = detectPlateau(weekly([90, 91, 92, 94, 95, 96]), TODAY);
    expect(r.status).toBe('PROGRESSING');
    expect(r.signals).toContain('STRENGTH_UP');
    expect(r.signals).toContain('NEW_PERSONAL_RECORD');
    expect(r.evidence.changePct).toBeGreaterThan(1);
  });

  it('una sola sesión mala no es estancamiento ni retroceso', () => {
    const r = detectPlateau(weekly([90, 91, 92, 93, 80, 95]), TODAY);
    expect(r.status).toBe('PROGRESSING');
  });

  it('marca posible estancamiento si no mejora en semanas', () => {
    const r = detectPlateau(weekly([92, 91, 92, 92, 91, 92, 92, 91]), TODAY);
    expect(r.status).toBe('POTENTIAL_PLATEAU');
    expect(r.signals[0]).toBe('NO_STRENGTH_GAIN');
    expect(r.evidence.sessions).toBe(8);
    expect(r.evidence.daysSinceRecord).toBeGreaterThanOrEqual(21);
  });

  it('marca retroceso si la caída es persistente', () => {
    const r = detectPlateau(weekly([95, 96, 95, 94, 91, 90, 89, 88]), TODAY);
    expect(r.status).toBe('REGRESSION');
    expect(r.signals[0]).toBe('STRENGTH_DOWN');
    expect(r.evidence.recentSessionsBelowBaseline).toBeGreaterThanOrEqual(2);
    expect(r.evidence.trendPctPerWeek).toBeLessThan(0);
  });

  it('ignora lo que queda fuera de la ventana de 8 semanas', () => {
    const old = weekly([120, 121, 122, 123], addDays(TODAY, -200));
    const r = detectPlateau([...old, ...weekly([90, 91, 92])], TODAY);
    expect(r.status).toBe('INSUFFICIENT_DATA');
    expect(r.evidence.sessions).toBe(3);
  });
});

describe('analyzeStrength', () => {
  it('calcula marcas, volumen y cobertura de RIR sin contar el calentamiento', () => {
    const s1 = session(addDays(TODAY, -7), {
      sets: [
        ...sets('bench', [[40, 10]], { warmup: true }),
        ...sets('bench', [
          [70, 8, 2],
          [70, 8],
        ]),
      ],
    });
    const s2 = session(TODAY, {
      sets: sets('bench', [
        [72.5, 8, 2],
        [72.5, 7, 0],
      ]),
    });
    const { exercises, summary } = analyzeStrength([s1, s2], [bench], {
      today: TODAY,
      bodyWeightKg: 80,
    });
    const b = exercises[0];
    expect(b.sessions).toBe(2);
    expect(b.history[0].workingSets).toBe(2);
    expect(b.history[0].volumeKg).toBe(70 * 16);
    expect(b.heaviestKg).toBe(72.5);
    expect(b.bestSet).toMatchObject({ weightKg: 72.5, reps: 8, rir: 2 });
    expect(b.bestE1rm?.day).toBe(TODAY);
    expect(b.rirCoverage).toBe(0.75);
    expect(b.plateau.status).toBe('INSUFFICIENT_DATA');
    expect(summary.INSUFFICIENT_DATA).toBe(1);
  });

  it('en peso corporal suma el peso del usuario a la carga', () => {
    const s = session(TODAY, { sets: sets('pull_up', [[10, 5, 0]]) });
    const withBody = analyzeStrength([s], [pullUp], {
      today: TODAY,
      bodyWeightKg: 80,
    }).exercises[0];
    expect(withBody.history[0].volumeKg).toBe(90 * 5);
    expect(withBody.bestE1rm?.value).toBeCloseTo((90 * 36) / 32, 1);
  });

  it('sin peso corporal ni lastre no inventa un e1RM', () => {
    const s = session(TODAY, { sets: sets('pull_up', [[0, 8, 0]]) });
    const a = analyzeStrength([s], [pullUp], {
      today: TODAY,
      bodyWeightKg: null,
    }).exercises[0];
    expect(a.bestE1rm).toBeNull();
    expect(a.bestSet?.reps).toBe(8);
  });
});
