import { describe, expect, it } from 'vitest';
import type { Exercise } from '../performance/perf.api';
import { searchExercises } from './search';

const ex = (name: string, description: string | null = null): Exercise => ({
  id: name,
  code: null,
  name,
  isBodyweight: false,
  description,
  steps: [],
  ownerUserId: null,
  customized: false,
  muscles: [],
});

const LIST = [
  ex('Press francés', 'Tumbado, bajas una barra hacia la frente.'),
  ex('Good morning con barra', 'En algunos gimnasios lo llaman «buenos días».'),
  ex('Press de banca', 'Tumbado en un banco plano.'),
];

describe('buscar ejercicios', () => {
  it('no distingue tildes ni mayúsculas', () => {
    expect(searchExercises(LIST, 'press frances').map((e) => e.name)).toEqual(['Press francés']);
    expect(searchExercises(LIST, 'PRESS').map((e) => e.name)).toEqual(['Press francés', 'Press de banca']);
  });

  it('encuentra también por la descripción, detrás de los que coinciden en el nombre', () => {
    expect(searchExercises(LIST, 'buenos dias').map((e) => e.name)).toEqual(['Good morning con barra']);
    expect(searchExercises(LIST, 'banca').map((e) => e.name)).toEqual(['Press de banca']);
    expect(searchExercises(LIST, 'tumbado').map((e) => e.name)).toEqual(['Press francés', 'Press de banca']);
  });

  it('sin búsqueda devuelve todos', () => {
    expect(searchExercises(LIST, '  ')).toHaveLength(3);
  });
});
