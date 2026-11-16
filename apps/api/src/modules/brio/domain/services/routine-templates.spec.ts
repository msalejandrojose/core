import { EXERCISES } from '../../../../seeds/brio-exercises.data';
import { cleanRoutine, hevyRoutineFrom } from './routine';
import { ROUTINE_TEMPLATES, routineFromTemplate } from './routine-templates';

const CODES = new Set(EXERCISES.map((e) => e.code));
const MEASURE = new Map(EXERCISES.map((e) => [e.code, e.measure ?? 'REPS']));

describe('routine-templates', () => {
  it.each(ROUTINE_TEMPLATES.map((t) => [t.code, t]))(
    '%s usa ejercicios del catálogo con el objetivo que toca a su medida',
    (_code, t) => {
      for (const i of t.items) {
        expect(CODES.has(i.code)).toBe(true);
        const m = MEASURE.get(i.code);
        if (m === 'DISTANCE') expect(i.distanceM).toBeGreaterThan(0);
        if (m === 'TIME') expect(i.durationSec).toBeGreaterThan(0);
        if (m === 'CALORIES') expect(i.calories).toBeGreaterThan(0);
        if (m === 'REPS') expect(i.reps).toBeGreaterThan(0);
      }
      const input = routineFromTemplate(t, (c) => `id-${c}`);
      expect(input).not.toBeNull();
      expect(() => cleanRoutine(input!)).not.toThrow();
    },
  );

  it('la simulación HYROX va entera en una superserie: 8 carreras y 8 estaciones', () => {
    const sim = ROUTINE_TEMPLATES.find((t) => t.code === 'hyrox-sim')!;
    const r = cleanRoutine(routineFromTemplate(sim, (c) => c)!);
    expect(r.exercises).toHaveLength(16);
    expect(r.exercises.filter((e) => e.exerciseId === 'running')).toHaveLength(
      8,
    );
    expect(new Set(r.exercises.map((e) => e.supersetGroup))).toEqual(
      new Set([1]),
    );
  });

  it('sin el ejercicio en el catálogo no se crea la rutina', () => {
    expect(
      routineFromTemplate(ROUTINE_TEMPLATES[0], () => undefined),
    ).toBeNull();
  });

  it('a Hevy van metros y segundos en vez de repeticiones', () => {
    const r = hevyRoutineFrom(
      [
        {
          exerciseId: 'run',
          name: 'Carrera',
          sets: 1,
          reps: 1,
          weightKg: null,
          restSec: null,
          measure: 'DISTANCE',
          distanceM: 1000,
        },
        {
          exerciseId: 'plank',
          name: 'Plancha',
          sets: 1,
          reps: 1,
          weightKg: null,
          restSec: null,
          measure: 'TIME',
          durationSec: 60,
        },
      ],
      (id) => `T-${id}`,
    );
    expect(r.exercises[0].sets[0]).toEqual({
      type: 'normal',
      weight_kg: null,
      reps: null,
      distance_meters: 1000,
    });
    expect(r.exercises[1].sets[0]).toEqual({
      type: 'normal',
      weight_kg: null,
      reps: null,
      duration_seconds: 60,
    });
  });
});
