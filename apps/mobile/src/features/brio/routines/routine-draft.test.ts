import { describe, expect, it } from 'vitest';
import {
  EMPTY_ROUTINE,
  draftFrom,
  musclesLine,
  musclesOf,
  paceToSec,
  routineBody,
  routineSummary,
  workoutDraftFrom,
} from './routine-draft';
import type { Routine } from './routines.api';

const bench = {
  exerciseId: 'e1',
  code: 'bench_press',
  name: 'Press de banca',
  sets: 4,
  reps: 8,
  weightKg: 62.5,
  restSec: 120,
  supersetGroup: null,
  muscles: [
    { muscle: 'CHEST', weight: 1 },
    { muscle: 'TRICEPS', weight: 0.5 },
  ],
};

const torso: Routine = {
  id: 'r1',
  name: 'Torso A',
  kind: 'STRENGTH',
  notes: null,
  plannedDurationMin: 60,
  plannedDistanceM: null,
  targetPaceSecPerKm: null,
  hevyRoutineId: null,
  hevySentAt: null,
  exercises: [bench],
  muscles: [],
  lastDoneAt: null,
  timesDone: 0,
};

describe('routine-draft', () => {
  it('ida y vuelta: rutina → borrador → cuerpo para la API', () => {
    const d = draftFrom(torso);
    expect(d.exercises[0]).toMatchObject({ sets: 4, reps: 8, weight: '62,5', rest: '120' });
    expect(routineBody(d)).toEqual({
      name: 'Torso A',
      kind: 'STRENGTH',
      notes: null,
      plannedDurationMin: 60,
      exercises: [{ exerciseId: 'e1', sets: 4, reps: 8, weightKg: 62.5, restSec: 120, supersetGroup: null }],
    });
  });

  it('cardio: distancia en metros y ritmo en segundos, sin ejercicios', () => {
    const body = routineBody({ ...EMPTY_ROUTINE, name: ' Series ', kind: 'RUN', minutes: '50', distanceKm: '8,5', pace: '4:30' });
    expect(body).toEqual({
      name: 'Series',
      kind: 'RUN',
      notes: null,
      plannedDurationMin: 50,
      plannedDistanceM: 8500,
      targetPaceSecPerKm: 270,
    });
    expect(paceToSec('4:7')).toBeNull();
  });

  it('reparte por músculos como la API y lo cuenta en una línea', () => {
    const m = musclesOf([bench, { sets: 2, muscles: [{ muscle: 'TRICEPS', weight: 1 }] }]);
    expect(m.map((x) => [x.muscle, x.share])).toEqual([
      ['CHEST', 0.5],
      ['TRICEPS', 0.5],
    ]);
    expect(musclesLine(m)).toBe('Pectoral y Tríceps');
  });

  it('resume la rutina en una línea', () => {
    expect(routineSummary(torso)).toBe('1 ejercicio · 4 series · 60 min');
    expect(
      routineSummary({ kind: 'RUN', exercises: [], plannedDurationMin: 45, plannedDistanceM: 8000, targetPaceSecPerKm: 330 }),
    ).toBe('45 min · 8 km · 5:30/km');
  });

  it('prepara el registro con una fila por serie prevista', () => {
    const w = workoutDraftFrom(torso);
    expect(w[0].sets).toHaveLength(4);
    expect(w[0].sets[0]).toEqual({ weight: '62,5', reps: '8', rir: '', warmup: false });
    expect(w[0].rest).toBe('120');
  });
});
