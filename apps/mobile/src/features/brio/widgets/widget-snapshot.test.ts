import { describe, expect, it } from 'vitest';
import { parseDeepLink } from './deep-links';
import { widgetSnapshot, type SnapshotInput } from './widget-snapshot';

const totals = {
  kcalIn: 1400,
  kcalBurned: 400,
  kcalBurnedCounted: 300,
  kcalTarget: 2400,
  kcalRemaining: 1300,
  proteinG: 96.4,
  carbsG: 180,
  fatG: 48,
  weightKg: 76,
};

const planned = (title: string, kind = 'STRENGTH', load: 'MEDIUM' | 'REST' = 'MEDIUM') =>
  ({
    id: 'p',
    day: '2026-11-26',
    kind,
    templateCode: null,
    title,
    load,
    startTime: '18:30',
    plannedDurationMin: 60,
    plannedDistanceM: null,
    targetPaceSecPerKm: null,
    structure: { routineId: 'r1' },
    notes: null,
    completedAt: null,
    completedSessionId: null,
    actualNotes: null,
    skipped: false,
  }) as const;

const base: SnapshotInput = {
  day: '2026-11-26',
  totals,
  done: [],
  plan: { day: '2026-11-26', planned: planned('Torso A'), status: 'TODAY', actual: null, autoCompleted: false },
  week: [
    { day: '2026-11-23', planned: null, status: 'FREE', actual: null, autoCompleted: false, workouts: [{ id: 'a', kind: 'OTHER', code: 'padel', title: 'Pádel', durationSec: 3600, distanceM: null }] },
    { day: '2026-11-26', planned: planned('Torso A'), status: 'TODAY', actual: null, autoCompleted: false },
  ],
  steps: 8432,
  macroTargets: { proteinG: 140, carbsG: 250, fatG: 70 },
  now: 1,
};

describe('widgets de iOS', () => {
  it('Hoy: kcal que quedan, minutos frente a lo planificado, pasos y macros', () => {
    const s = widgetSnapshot(base);
    expect(s.food).toMatchObject({ label: '1.300 kcal quedan', remaining: 1300, eaten: 1400 });
    expect(s.move).toMatchObject({ minutes: 0, goal: 60, ratio: 0 });
    expect(s.steps).toMatchObject({ value: 8432, label: '8.432 pasos' });
    expect(s.macros.map((m) => [m.key, m.grams, m.target])).toEqual([
      ['protein', 96, 140],
      ['carbs', 180, 250],
      ['fat', 48, 70],
    ]);
  });

  it('entreno planificado con su rutina para empezarlo; hecho, con lo que hiciste', () => {
    expect(widgetSnapshot(base).workout).toMatchObject({
      state: 'planned',
      kicker: 'Hoy entrenas · 18:30',
      title: 'Torso A',
      family: 'strength',
      routineId: 'r1',
    });
    const done = widgetSnapshot({
      ...base,
      done: [
        { name: 'Fútbol 7', kind: 'OTHER', code: 'football_7', durationSec: 3600, kcal: 520 },
        { name: 'Gimnasio', kind: 'STRENGTH', code: 'strength', durationSec: 2700, kcal: 300 },
      ],
    });
    expect(done.workout).toMatchObject({ state: 'done', kicker: 'Hoy has entrenado 2 veces', title: 'Fútbol 7 + Gimnasio', family: 'team' });
    expect(done.move.minutes).toBe(105);
  });

  it('descanso y sin plan', () => {
    const rest = widgetSnapshot({ ...base, plan: { ...base.plan!, planned: planned('Descanso', 'OTHER', 'REST'), status: 'REST' } });
    expect(rest.workout.state).toBe('rest');
    expect(widgetSnapshot({ ...base, plan: null }).workout.state).toBe('none');
  });

  it('la semana con la familia del deporte de cada día', () => {
    const s = widgetSnapshot(base);
    expect(s.week.map((d) => [d.letter, d.state, d.family, d.isToday])).toEqual([
      ['L', 'done', 'racket', false],
      ['J', 'today', 'strength', true],
    ]);
  });

  it('enlaces brio:// de los widgets', () => {
    expect(parseDeepLink('brio://hoy')).toEqual({ kind: 'route', path: '/tabs/today' });
    expect(parseDeepLink('brio://plan')).toEqual({ kind: 'route', path: '/tabs/entrenos/plan' });
    expect(parseDeepLink('brio://entreno?routine=r1')).toEqual({ kind: 'start-workout', routineId: 'r1' });
    expect(parseDeepLink('brio://entreno')).toEqual({ kind: 'start-workout', routineId: null });
    expect(parseDeepLink('brio://registrar')).toEqual({ kind: 'register', sheet: 'menu' });
    expect(parseDeepLink('brio://registrar/comida')).toEqual({ kind: 'register', sheet: 'meal' });
    expect(parseDeepLink('brio://registrar/entreno/')).toEqual({ kind: 'register', sheet: 'activity' });
    expect(parseDeepLink('brio://registrar/raro')).toEqual({ kind: 'register', sheet: 'menu' });
    expect(parseDeepLink('https://otra.cosa')).toBeNull();
  });
});
