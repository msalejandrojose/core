import { describe, expect, it } from 'vitest';
import { currentFocus, mergeActivityState, toActivityState } from './live-activity';
import { emptyWorkout, toggleSet, type LiveExercise, type LiveWorkout } from './live-workout';

const ex = (name: string, extra: Partial<LiveExercise> = {}): LiveExercise => ({
  exerciseId: name,
  name,
  bodyweight: false,
  measure: 'REPS',
  muscles: '',
  restSec: 90,
  group: null,
  previous: null,
  sets: [
    { weight: '60', reps: '10', distance: '', time: '', cal: '', done: false },
    { weight: '60', reps: '10', distance: '', time: '', cal: '', done: false },
  ],
  ...extra,
});

const workout = (): LiveWorkout => ({ ...emptyWorkout('Pierna', 1000), exercises: [ex('Sentadilla'), ex('Prensa')] });

describe('toActivityState', () => {
  it('lleva ejercicios, series y el descanso de cada uno', () => {
    const st = toActivityState(workout(), 3);
    expect(st).toMatchObject({ title: 'Pierna', focus: 0, rev: 3 });
    expect(st.exercises[0]).toEqual({
      name: 'Sentadilla',
      unit: 'reps',
      rest: 90,
      sets: [
        { w: '60', r: '10', d: false },
        { w: '60', r: '10', d: false },
      ],
    });
  });

  it('en superserie solo descansa el último del grupo', () => {
    const w = { ...workout(), exercises: [ex('A', { group: 1 }), ex('B', { group: 1 })] };
    expect(toActivityState(w).exercises.map((e) => e.rest)).toEqual([0, 90]);
  });
});

describe('currentFocus', () => {
  it('sin foco, el primer ejercicio con series pendientes', () => {
    const w = workout();
    w.exercises[0].sets.forEach((s) => (s.done = true));
    expect(currentFocus(w)).toBe(1);
  });
  it('marcar una serie enfoca su ejercicio', () => {
    expect(toggleSet(workout(), 1, 0, 5000).focus).toBe(1);
  });
});

describe('mergeActivityState', () => {
  it('aplica serie hecha, peso, repes, foco y descanso', () => {
    const w = workout();
    const st = toActivityState(w);
    st.exercises[0].sets[0] = { w: '62,5', r: '8', d: true };
    st.focus = 0;
    st.restUntil = 99_000;
    const m = mergeActivityState(w, st);
    expect(m.exercises[0].sets[0]).toMatchObject({ weight: '62,5', reps: '8', done: true });
    expect(m.restUntil).toBe(99_000);
    expect(m.restFor).toBe(90);
  });

  it('ignora ejercicios que ya no encajan', () => {
    const w = workout();
    const st = toActivityState(w);
    st.exercises[1] = { ...st.exercises[1], name: 'Otro', sets: [{ w: '1', r: '1', d: true }] };
    expect(mergeActivityState(w, st).exercises[1]).toEqual(w.exercises[1]);
  });
});
