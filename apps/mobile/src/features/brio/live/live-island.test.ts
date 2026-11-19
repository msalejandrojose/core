import { describe, expect, it, vi } from 'vitest';
import { liveIslandFor, nextUp } from './useLiveIsland';
import type { LiveWorkout } from './live-workout';

const set = (done: boolean, warmup = false) => ({ weight: '60', reps: '10', distance: '', time: '', cal: '', done, warmup });
const workout = (over: Partial<LiveWorkout> = {}): LiveWorkout => ({
  routineId: null,
  name: 'Torso A',
  startedAt: 1_000,
  restUntil: null,
  restFor: null,
  exercises: [
    { exerciseId: 'a', name: 'Press de banca', bodyweight: false, measure: 'REPS', muscles: '', restSec: 90, group: null, previous: null, sets: [set(true), set(true)] },
    { exerciseId: 'b', name: 'Remo con barra', bodyweight: false, measure: 'REPS', muscles: '', restSec: 90, group: null, previous: null, sets: [set(true, true), set(false)] },
  ],
  ...over,
});
const actions = { onAdd: vi.fn(), onSkip: vi.fn(), onOpen: vi.fn() };

describe('isla del entreno en vivo', () => {
  it('lo siguiente que toca, sin contar el calentamiento', () => {
    expect(nextUp(workout())).toEqual({ name: 'Remo con barra', set: 'serie 1' });
    const w = workout();
    w.exercises[1].sets = [set(false, true)];
    expect(nextUp(w)).toEqual({ name: 'Remo con barra', set: 'calentamiento' });
    w.exercises[1].sets = [set(true)];
    expect(nextUp(w)).toBeNull();
  });

  it('con descanso en marcha, el descanso; si no, el entreno', () => {
    const now = 100_000;
    const rest = liveIslandFor(workout({ restUntil: now + 60_000, restFor: 90 }), now, actions);
    expect(rest).toMatchObject({ kind: 'rest', until: now + 60_000, total: 90, next: 'Remo con barra' });
    const done = liveIslandFor(workout({ restUntil: now - 1, restFor: 90 }), now, actions);
    expect(done).toMatchObject({ kind: 'workout', name: 'Torso A', done: 3, total: 4, startedAt: 1_000 });
  });
});
