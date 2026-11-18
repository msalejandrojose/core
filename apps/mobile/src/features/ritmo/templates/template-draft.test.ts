import { describe, expect, it } from 'vitest';
import { draftFromTemplate, templateBodyFromDraft, templateExerciseLine } from './template-draft';
import type { WorkoutTemplate } from '../templates.api';

const T: WorkoutTemplate = {
  id: 't1',
  name: 'Pecho + Hombro',
  updatedAt: '',
  exercises: [
    { exerciseId: 'press', name: 'Press de pecho en máquina', isBodyweight: false, sets: 3, reps: 10, weightKg: 24.8 },
    { exerciseId: 'fondos', name: 'Fondos en banco', isBodyweight: true, sets: 2, reps: 12, weightKg: null },
  ],
};

describe('plantillas ↔ entreno', () => {
  it('una plantilla rellena el entreno con sus series y la referencia', () => {
    const d = draftFromTemplate(T);
    expect(d[0]).toMatchObject({ exerciseId: 'press', bodyweight: false });
    expect(d[0].sets).toEqual([
      { weight: '24,8', reps: '10', rir: '', warmup: false },
      { weight: '24,8', reps: '10', rir: '', warmup: false },
      { weight: '24,8', reps: '10', rir: '', warmup: false },
    ]);
    expect(d[1].sets[0]).toEqual({ weight: '', reps: '12', rir: '', warmup: false });
  });

  it('guardar un entreno como plantilla cuenta las series de trabajo y toma la más pesada', () => {
    const body = templateBodyFromDraft('  Espalda  ', [
      {
        exerciseId: 'jalon',
        name: 'Jalón',
        bodyweight: false,
        rest: '',
        sets: [
          { weight: '30', reps: '12', rir: '', warmup: true },
          { weight: '52', reps: '10', rir: '', warmup: false },
          { weight: '66,5', reps: '8', rir: '', warmup: false },
          { weight: '', reps: '', rir: '', warmup: false },
        ],
      },
      { exerciseId: 'jalon', name: 'Jalón', bodyweight: false, rest: '', sets: [{ weight: '1', reps: '1', rir: '', warmup: false }] },
      { exerciseId: 'dominadas', name: 'Dominadas', bodyweight: true, rest: '', sets: [{ weight: '', reps: '7', rir: '', warmup: false }] },
    ]);
    expect(body).toEqual({
      name: 'Espalda',
      exercises: [
        { exerciseId: 'jalon', sets: 3, reps: 8, weightKg: 66.5 },
        { exerciseId: 'dominadas', sets: 1, reps: 7 },
      ],
    });
  });

  it('resume cada ejercicio en una línea', () => {
    expect(templateExerciseLine(T.exercises[0])).toBe('3 × 10 · 24,8 kg');
    expect(templateExerciseLine(T.exercises[1])).toBe('2 × 12');
  });
});
