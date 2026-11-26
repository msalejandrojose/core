import { EXERCISES } from '../../../../seeds/brio-exercises.data';
import {
  HEVY_EXERCISES,
  HEVY_TITLES,
} from '../../../../seeds/brio-exercises-hevy.data';
import { catalogCodeFor } from './hevy';

const CODES = new Set(EXERCISES.map((e) => e.code));

describe('catálogo frente a Hevy', () => {
  it('cada ejercicio de Hevy de la lista casa con uno del catálogo', () => {
    const missing = HEVY_TITLES.filter((t) => !catalogCodeFor(t, CODES));
    expect(missing).toEqual([]);
  });

  it('las variantes de material no se mezclan (barra ≠ mancuernas)', () => {
    expect(catalogCodeFor('Deadlift (Dumbbell)', CODES)).toBe(
      'dumbbell_deadlift',
    );
    expect(catalogCodeFor('Deadlift (Barbell)', CODES)).toBe('deadlift');
    expect(catalogCodeFor('Incline Bench Press (Smith Machine)', CODES)).toBe(
      'smith_incline_bench_press',
    );
    expect(catalogCodeFor('Arnold Press (Dumbbell)', CODES)).toBe(
      'dumbbell_arnold_press',
    );
  });

  it('sin códigos ni nombres repetidos', () => {
    const dup = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i);
    expect(dup(EXERCISES.map((e) => e.code))).toEqual([]);
    expect(dup(EXERCISES.map((e) => e.name.toLowerCase()))).toEqual([]);
  });

  it('los nuevos traen ficha: descripción y pasos', () => {
    for (const e of HEVY_EXERCISES) {
      expect(e.description?.length ?? 0).toBeGreaterThan(20);
      expect(e.steps?.length ?? 0).toBeGreaterThanOrEqual(3);
      expect(e.p.length).toBeGreaterThan(0);
    }
  });
});
