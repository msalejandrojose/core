import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/client', () => ({ apiClient: {} }));

import {
  EMPTY_CARDIO,
  cardioBody,
  cardioDraftFromSession,
  cardioPatch,
  bestSetLabel,
  clock,
  draftsFromSets,
  exerciseVolume,
  exercisesBody,
  finishLiveDrafts,
  isExerciseDone,
  setLabel,
  type DraftExercise,
  type DraftSet,
} from './workout-draft';

const set = (weight: string, reps: string, rir = '', warmup = false): DraftSet => ({ weight, reps, rir, warmup });
const ex = (sets: DraftSet[], extra: Partial<DraftExercise> = {}): DraftExercise => ({
  exerciseId: 'bench',
  name: 'Press',
  bodyweight: false,
  rest: '',
  sets,
  ...extra,
});

describe('exercisesBody', () => {
  it('convierte lo tecleado y acepta coma decimal', () => {
    expect(exercisesBody([ex([set('72,5', '8', '2')])])).toEqual([
      { exerciseId: 'bench', sets: [{ weightKg: 72.5, reps: 8, rir: 2 }] },
    ]);
  });

  it('descarta series incompletas y ejercicios sin series válidas', () => {
    expect(
      exercisesBody([
        ex([set('70', ''), set('', '8'), set('70', '8')]),
        ex([set('', '')], { exerciseId: 'row' }),
      ]),
    ).toEqual([{ exerciseId: 'bench', sets: [{ weightKg: 70, reps: 8 }] }]);
  });

  it('en peso corporal el lastre vacío es 0', () => {
    expect(exercisesBody([ex([set('', '8', '1')], { bodyweight: true })])[0].sets).toEqual([
      { weightKg: 0, reps: 8, rir: 1 },
    ]);
  });

  it('ignora un RIR fuera de rango', () => {
    expect(exercisesBody([ex([set('70', '8', '15')])])[0].sets[0]).toEqual({ weightKg: 70, reps: 8 });
  });

  it('marca el calentamiento y pone el descanso desde la segunda serie válida', () => {
    expect(
      exercisesBody([ex([set('40', '10', '', true), set('', ''), set('70', '8'), set('70', '8')], { rest: '120' })])[0]
        .sets,
    ).toEqual([
      { weightKg: 40, reps: 10, isWarmup: true },
      { weightKg: 70, reps: 8, restSec: 120 },
      { weightKg: 70, reps: 8, restSec: 120 },
    ]);
  });
});

describe('cardioBody', () => {
  it('pasa los km a metros y omite lo vacío o absurdo', () => {
    expect(cardioBody({ ...EMPTY_CARDIO, distanceKm: '8,4', avgHr: '150', elevation: '60', cadence: '172' })).toEqual({
      distanceM: 8400,
      avgHeartRate: 150,
      elevationGainM: 60,
      cadence: 172,
    });
    expect(cardioBody({ ...EMPTY_CARDIO, distanceKm: '0', avgHr: '400', maxHr: '10', cadence: '900' })).toEqual({});
  });

  it('manda el tiempo por zona en segundos solo si hay alguna rellena', () => {
    expect(cardioBody({ ...EMPTY_CARDIO, zones: ['5', '25', '', '3,5', ''] })).toEqual({
      zoneSeconds: [300, 1500, 0, 210, 0],
    });
    expect(cardioBody(EMPTY_CARDIO).zoneSeconds).toBeUndefined();
  });
});

describe('draftsFromSets', () => {
  const saved = (exerciseOrder: number, setOrder: number, extra = {}) => ({
    exerciseId: exerciseOrder === 0 ? 'bench' : 'row',
    exerciseOrder,
    setOrder,
    weightKg: 72.5,
    reps: 8,
    rir: 2 as number | null,
    restSec: null as number | null,
    isWarmup: false,
    ...extra,
  });
  const catalog = [{ id: 'bench', name: 'Press de banca', isBodyweight: false }];

  it('agrupa por ejercicio, respeta el orden y vuelve a ser lo mismo al guardar', () => {
    const drafts = draftsFromSets(
      [saved(1, 0), saved(0, 1, { restSec: 90 }), saved(0, 0, { isWarmup: true, rir: null })],
      catalog,
    );
    expect(drafts.map((d) => d.name)).toEqual(['Press de banca', 'Ejercicio']);
    expect(drafts[0]).toMatchObject({ rest: '90', sets: [{ weight: '72,5', warmup: true, rir: '' }, { rir: '2' }] });
    expect(exercisesBody(drafts)[0].sets).toEqual([
      { weightKg: 72.5, reps: 8, isWarmup: true },
      { weightKg: 72.5, reps: 8, rir: 2, restSec: 90 },
    ]);
  });
});

describe('editar el cardio de un entreno', () => {
  const saved = {
    distanceM: 8400,
    avgHeartRate: 150,
    maxHeartRate: null,
    elevationGainM: 60,
    cadence: 172,
    zoneSeconds: [300, 1500, 0, 210, 0],
  } as never;

  it('carga lo guardado en el formulario y, sin tocar nada, manda lo mismo', () => {
    const draft = cardioDraftFromSession(saved);
    expect(draft).toMatchObject({ distanceKm: '8,4', avgHr: '150', maxHr: '', cadence: '172', zones: ['5', '25', '', '3,5', ''] });
    expect(cardioPatch(draft)).toEqual({
      distanceM: 8400,
      avgHeartRate: 150,
      maxHeartRate: null,
      elevationGainM: 60,
      cadence: 172,
      zoneSeconds: [300, 1500, 0, 210, 0],
    });
  });

  it('lo que se vacía se manda como null para borrarlo', () => {
    const draft = { ...cardioDraftFromSession(saved), distanceKm: '', zones: ['', '', '', '', ''] };
    expect(cardioPatch(draft)).toMatchObject({ distanceM: null, zoneSeconds: null, avgHeartRate: 150 });
  });
});

describe('exerciseVolume', () => {
  it('suma peso × reps de las series de trabajo, sin calentamiento ni incompletas', () => {
    expect(exerciseVolume(ex([set('40', '10', '', true), set('70', '8'), set('67,5', '8'), set('70', '')]))).toBe(1100);
  });
  it('en ejercicios de peso corporal cuenta solo el lastre', () => {
    expect(exerciseVolume(ex([set('', '10'), set('10', '5')], { bodyweight: true }))).toBe(50);
  });
});

describe('finishLiveDrafts', () => {
  it('guarda solo las series hechas y quita la marca', () => {
    const out = finishLiveDrafts([
      ex([{ ...set('70', '8'), done: true }, set('70', '8')]),
      ex([set('90', '5')], { exerciseId: 'squat' }),
    ]);
    expect(out).toEqual([ex([set('70', '8')])]);
    expect('done' in out[0].sets[0]).toBe(false);
  });
  it('si no se marcó ninguna, respeta todo lo apuntado', () => {
    expect(finishLiveDrafts([ex([set('70', '8'), set('70', '7')])])).toEqual([ex([set('70', '8'), set('70', '7')])]);
  });
});

describe('setLabel y clock', () => {
  it('formatea la serie anterior', () => {
    expect(setLabel({ weightKg: 67.5, reps: 8 }, false)).toBe('67,5 × 8');
    expect(setLabel({ weightKg: 0, reps: 12 }, true)).toBe('12 reps');
  });
  it('formatea el cronómetro', () => {
    expect(clock(5)).toBe('0:05');
    expect(clock(245)).toBe('4:05');
    expect(clock(3729)).toBe('1:02:09');
  });
});

describe('isExerciseDone y bestSetLabel', () => {
  const done = (w: string, r: string, warmup = false): DraftSet => ({ ...set(w, r, '', warmup), done: true });
  it('un ejercicio está hecho solo con todas sus series marcadas', () => {
    expect(isExerciseDone(ex([done('70', '8'), done('70', '8')]))).toBe(true);
    expect(isExerciseDone(ex([done('70', '8'), set('70', '8')]))).toBe(false);
    expect(isExerciseDone(ex([]))).toBe(false);
  });
  it('la mejor serie es la más pesada hecha, sin calentamiento', () => {
    expect(bestSetLabel(ex([done('100', '3', true), done('70', '8'), done('72,5', '6'), done('72,5', '7'), set('90', '5')]))).toBe('72,5 × 7');
    expect(bestSetLabel(ex([set('70', '8')]))).toBeNull();
  });
});
