import { describe, expect, it } from 'vitest';
import type { Routine } from '../routines/routines.api';
import {
  isHybrid,
  linkWithNext,
  setRest,
  addExercise,
  addRest,
  addSet,
  clock,
  doneSummary,
  isExerciseDone,
  nextPending,
  previousAsSet,
  previousSetAt,
  previousSetLabel,
  removeLastSet,
  toggleWarmup,
  workNumber,
  editSet,
  previousLine,
  progress,
  routineWithTodayWeights,
  skipRest,
  startFromRoutine,
  toLogBody,
  toggleSet,
} from './live-workout';

const routine: Routine = {
  id: 'r1',
  name: 'Torso A',
  kind: 'STRENGTH',
  notes: null,
  plannedDurationMin: 60,
  plannedDistanceM: null,
  targetPaceSecPerKm: null,
  hevyRoutineId: null,
  hevySentAt: null,
  muscles: [],
  lastDoneAt: null,
  timesDone: 0,
  exercises: [
    {
      exerciseId: 'bench',
      code: 'bench_press',
      name: 'Press de banca',
      sets: 3,
      reps: 8,
      weightKg: null,
      restSec: 120,
      supersetGroup: null,
      measure: 'REPS',
      isBodyweight: false,
      distanceM: null,
      durationSec: null,
      calories: null,
      muscles: [
        { muscle: 'CHEST', weight: 1 },
        { muscle: 'TRICEPS', weight: 0.5 },
      ],
    },
    { exerciseId: 'row', code: null, name: 'Remo', sets: 2, reps: 10, weightKg: 50, restSec: null, supersetGroup: null, measure: 'REPS', isBodyweight: false, distanceM: null, durationSec: null, calories: null, muscles: [] },
  ],
};

const previous = [{ exerciseId: 'bench', day: '2026-11-10T08:00:00Z', sets: [{ weightKg: 70, reps: 8 }, { weightKg: 72.5, reps: 6 }] }];
const T0 = 1_000_000;

describe('live-workout', () => {
  it('empieza con las series de la rutina y el peso de la última vez si la rutina no lo tiene', () => {
    const w = startFromRoutine(routine, previous, (m) => m, T0);
    expect(w.exercises[0].sets).toEqual([
      { weight: '72,5', reps: '8', distance: '', time: '', cal: '', done: false },
      { weight: '72,5', reps: '8', distance: '', time: '', cal: '', done: false },
      { weight: '72,5', reps: '8', distance: '', time: '', cal: '', done: false },
    ]);
    expect(w.exercises[0].muscles).toBe('CHEST');
    expect(w.exercises[1].sets[0].weight).toBe('50');
  });

  it('marcar una serie arranca el descanso del ejercicio; desmarcarla no lo toca', () => {
    let w = startFromRoutine(routine, [], (m) => m, T0);
    w = editSet(w, 0, 0, { weight: '70' });
    w = toggleSet(w, 0, 0, T0 + 5000);
    expect(w.exercises[0].sets[0].done).toBe(true);
    expect(w.restUntil).toBe(T0 + 5000 + 120_000);
    // Las series siguientes sin peso heredan el de esta.
    expect(w.exercises[0].sets[1].weight).toBe('70');
    w = addRest(w, 15, T0 + 6000);
    expect(w.restFor).toBe(135);
    w = skipRest(w);
    expect(w.restUntil).toBeNull();
    // Remo no tiene descanso: no arranca contador.
    w = toggleSet(w, 1, 0, T0 + 10_000);
    expect(w.restUntil).toBeNull();
  });

  it('cuenta progreso y volumen solo con las series hechas', () => {
    let w = startFromRoutine(routine, previous, (m) => m, T0);
    w = toggleSet(w, 0, 0, T0);
    w = toggleSet(w, 0, 1, T0);
    w = addSet(w, 1);
    expect(progress(w)).toEqual({ done: 2, total: 6, volumeKg: 1160, distanceM: 0 });
  });

  it('convierte en entreno para la API con la rutina enlazada', () => {
    let w = startFromRoutine(routine, previous, (m) => m, T0);
    w = toggleSet(w, 0, 0, T0);
    w = toggleSet(w, 0, 1, T0);
    w = editSet(w, 0, 1, { reps: '6' });
    const body = toLogBody(w, 'type-strength', 'VIGOROUS', T0 + 3_000_000);
    expect(body).toEqual({
      activityTypeId: 'type-strength',
      startedAt: new Date(T0).toISOString(),
      durationSec: 3000,
      effort: 'VIGOROUS',
      routineId: 'r1',
      exercises: [
        {
          exerciseId: 'bench',
          sets: [
            { weightKg: 72.5, reps: 8 },
            { weightKg: 72.5, reps: 6, restSec: 120 },
          ],
        },
      ],
    });
  });

  it('actualiza la rutina con el mayor peso hecho hoy y deja igual lo que no se hizo', () => {
    let w = startFromRoutine(routine, [], (m) => m, T0);
    w = editSet(w, 0, 0, { weight: '75' });
    w = toggleSet(w, 0, 0, T0);
    const body = routineWithTodayWeights(routine, w);
    expect(body.exercises?.map((e) => e.weightKg)).toEqual([75, 50]);
  });

  it('añade ejercicios sueltos con lo de la última vez', () => {
    const w = addExercise(
      startFromRoutine(routine, [], (m) => m, T0),
      { exerciseId: 'curl', name: 'Curl', bodyweight: false, measure: 'REPS', muscles: 'BICEPS', restSec: 60 },
      { exerciseId: 'curl', day: 'x', sets: [{ weightKg: 12, reps: 12 }] },
    );
    expect(w.exercises[2].sets[0]).toMatchObject({ weight: '12', reps: '12', done: false });
  });

  it('textos: la última vez y el reloj', () => {
    expect(previousLine(previous[0])).toBe('La última vez: 70×8, 72,5×6');
    expect(previousLine({ exerciseId: 'x', day: '', sets: [{ weightKg: 60, reps: 8 }, { weightKg: 60, reps: 7 }] })).toBe(
      'La última vez: 60 kg × 8, 7',
    );
    expect(previousLine(null)).toBeNull();
    expect(clock(65_000)).toBe('1:05');
    expect(clock(3_725_000)).toBe('1:02:05');
  });

  it('en superserie solo se descansa al acabar la vuelta, con el descanso del último', () => {
    let w = startFromRoutine(routine, [], (m) => m, T0);
    w = linkWithNext(w, 0);
    expect(w.exercises.map((e) => e.group)).toEqual([1, 1]);
    w = setRest(w, 1, 60);
    w = toggleSet(w, 0, 0, T0);
    expect(w.restUntil).toBeNull();
    w = toggleSet(w, 1, 0, T0);
    expect(w.restUntil).toBe(T0 + 60_000);
    // Separar vuelve a dejarlos sueltos.
    expect(linkWithNext(w, 0).exercises.map((e) => e.group)).toEqual([null, null]);
  });

  it('carrera y trineo: se guardan metros y tiempo, y el entreno cuenta como híbrido', () => {
    const hyrox: Routine = {
      ...routine,
      exercises: [
        { ...routine.exercises[1], exerciseId: 'run', name: 'Carrera', measure: 'DISTANCE', isBodyweight: true, sets: 1, reps: 1, weightKg: null, distanceM: 1000 },
        { ...routine.exercises[1], exerciseId: 'sled', name: 'Trineo', measure: 'DISTANCE', isBodyweight: false, sets: 1, reps: 1, weightKg: 152, distanceM: 50 },
      ],
    };
    let w = startFromRoutine(hyrox, [], (m) => m, T0);
    expect(isHybrid(w)).toBe(true);
    expect(w.exercises[0].sets[0]).toMatchObject({ distance: '1000', time: '' });
    w = editSet(w, 0, 0, { time: '4:05' });
    w = toggleSet(w, 0, 0, T0);
    w = toggleSet(w, 1, 0, T0);
    expect(progress(w)).toMatchObject({ done: 2, distanceM: 1050, volumeKg: 0 });
    expect(toLogBody(w, 'hyb', 'VIGOROUS', T0 + 600_000).exercises).toEqual([
      { exerciseId: 'run', sets: [{ weightKg: 0, reps: 0, distanceM: 1000, durationSec: 245 }] },
      { exerciseId: 'sled', sets: [{ weightKg: 152, reps: 0, distanceM: 50 }] },
    ]);
    expect(previousLine({ exerciseId: 'run', day: '', sets: [{ weightKg: 0, reps: 0, distanceM: 1000, durationSec: 245 }] }, 'DISTANCE')).toBe(
      'La última vez: 1 km en 4:05',
    );
  });

  it('un ejercicio con todas sus series hechas cuenta como hecho y se salta al siguiente pendiente', () => {
    let w = startFromRoutine(routine, previous, (m) => m, T0);
    expect(isExerciseDone(w.exercises[0])).toBe(false);
    for (let k = 0; k < 3; k++) w = toggleSet(w, 0, k, T0);
    expect(isExerciseDone(w.exercises[0])).toBe(true);
    expect(nextPending(w, 0)).toBe(1);
    // Hecho el último, vuelve al primero que quede.
    w = startFromRoutine(routine, previous, (m) => m, T0);
    for (let k = 0; k < 2; k++) w = toggleSet(w, 1, k, T0);
    expect(nextPending(w, 1)).toBe(0);
    for (let k = 0; k < 3; k++) w = toggleSet(w, 0, k, T0);
    expect(nextPending(w, 0)).toBeNull();
  });

  it('columna «Anterior»: la serie de la última vez por orden, en corto y copiable', () => {
    const w = startFromRoutine(routine, previous, (m) => m, T0);
    const bench = w.exercises[0];
    expect(previousSetAt(bench, 1)).toEqual({ weightKg: 72.5, reps: 6 });
    expect(previousSetAt(bench, 2)).toBeNull();
    expect(previousSetLabel({ weightKg: 72.5, reps: 6 }, 'REPS', false)).toBe('72,5×6');
    expect(previousSetLabel({ weightKg: 0, reps: 12 }, 'REPS', true)).toBe('12 reps');
    expect(previousSetLabel({ weightKg: 10, reps: 8 }, 'REPS', true)).toBe('+10×8');
    expect(previousSetLabel({ weightKg: 0, reps: 0, distanceM: 1000, durationSec: 245 }, 'DISTANCE', false)).toBe('1 km');
    expect(previousSetLabel({ weightKg: 0, reps: 0, durationSec: 90 }, 'TIME', false)).toBe('1:30');
    expect(previousAsSet({ weightKg: 72.5, reps: 6 }, 'REPS')).toEqual({ weight: '72,5', reps: '6' });
    const copied = editSet(w, 0, 0, previousAsSet({ weightKg: 72.5, reps: 6 }, 'REPS'));
    expect(copied.exercises[0].sets[0]).toMatchObject({ weight: '72,5', reps: '6', done: false });
  });

  it('resumen del ejercicio hecho: series y la mejor', () => {
    let w = startFromRoutine(routine, previous, (m) => m, T0);
    w = editSet(w, 0, 1, { weight: '75', reps: '6' });
    w = editSet(w, 0, 2, { weight: '75', reps: '7' });
    for (let k = 0; k < 3; k++) w = toggleSet(w, 0, k, T0);
    expect(doneSummary(w.exercises[0])).toBe('3 series · mejor 75 kg × 7');
  });

  it('calentamiento: sin número, empareja «Anterior» con las de trabajo y no cuenta para volumen ni rutina', () => {
    let w = startFromRoutine(routine, previous, (m) => m, T0);
    w = addSet(w, 0); // 4 series; la primera será calentamiento
    w = toggleWarmup(w, 0, 0);
    w = editSet(w, 0, 0, { weight: '40', reps: '10' });
    const bench = w.exercises[0];
    expect([0, 1, 2, 3].map((k) => workNumber(bench, k))).toEqual([null, 1, 2, 3]);
    expect(previousSetAt(bench, 0)).toBeNull();
    expect(previousSetAt(bench, 1)).toEqual({ weightKg: 70, reps: 8 });
    // Marcar el calentamiento no arrastra su peso a las de trabajo vacías.
    w = editSet(w, 0, 1, { weight: '' });
    w = toggleSet(w, 0, 0, T0);
    expect(w.exercises[0].sets[1].weight).toBe('');
    w = editSet(w, 0, 1, { weight: '70', reps: '8', rir: '2' });
    w = toggleSet(w, 0, 1, T0);
    expect(progress(w).volumeKg).toBe(560);
    const body = toLogBody(w, 'strength', 'MODERATE', T0 + 60_000);
    expect(body.exercises?.[0].sets).toEqual([
      { weightKg: 40, reps: 10, isWarmup: true },
      { weightKg: 70, reps: 8, rir: 2, restSec: 120 },
    ]);
    expect(routineWithTodayWeights(routine, w).exercises[0].weightKg).toBe(70);
    expect(doneSummary({ ...w.exercises[0], sets: w.exercises[0].sets.slice(0, 2) })).toBe('1 serie · mejor 70 kg × 8');
  });

  it('quitar la última serie solo si no está hecha y queda alguna', () => {
    let w = startFromRoutine(routine, previous, (m) => m, T0);
    w = removeLastSet(w, 0);
    expect(w.exercises[0].sets).toHaveLength(2);
    w = toggleSet(w, 0, 1, T0);
    expect(removeLastSet(w, 0).exercises[0].sets).toHaveLength(2);
    // Una serie añadida no hereda el calentamiento ni el RIR.
    w = toggleWarmup(editSet(w, 0, 1, { rir: '1' }), 0, 1);
    const added = addSet(w, 0).exercises[0].sets[2];
    expect(added).toMatchObject({ warmup: false, rir: '', done: false });
  });
});

