import { describe, expect, it, vi } from 'vitest';

vi.mock('@/api/client', () => ({ apiClient: {} }));

import { cardioBody, exercisesBody } from './workout-draft';

describe('exercisesBody', () => {
  it('convierte lo tecleado y acepta coma decimal', () => {
    expect(
      exercisesBody([
        { exerciseId: 'bench', name: 'Press', bodyweight: false, sets: [{ weight: '72,5', reps: '8', rir: '2' }] },
      ]),
    ).toEqual([{ exerciseId: 'bench', sets: [{ weightKg: 72.5, reps: 8, rir: 2 }] }]);
  });

  it('descarta series incompletas y ejercicios sin series válidas', () => {
    expect(
      exercisesBody([
        {
          exerciseId: 'bench',
          name: 'Press',
          bodyweight: false,
          sets: [
            { weight: '70', reps: '', rir: '' },
            { weight: '', reps: '8', rir: '' },
            { weight: '70', reps: '8', rir: '' },
          ],
        },
        { exerciseId: 'row', name: 'Remo', bodyweight: false, sets: [{ weight: '', reps: '', rir: '' }] },
      ]),
    ).toEqual([{ exerciseId: 'bench', sets: [{ weightKg: 70, reps: 8 }] }]);
  });

  it('en peso corporal el lastre vacío es 0', () => {
    expect(
      exercisesBody([
        { exerciseId: 'pull', name: 'Dominadas', bodyweight: true, sets: [{ weight: '', reps: '8', rir: '1' }] },
      ]),
    ).toEqual([{ exerciseId: 'pull', sets: [{ weightKg: 0, reps: 8, rir: 1 }] }]);
  });

  it('ignora un RIR fuera de rango', () => {
    expect(
      exercisesBody([
        { exerciseId: 'bench', name: 'Press', bodyweight: false, sets: [{ weight: '70', reps: '8', rir: '15' }] },
      ])?.[0].sets[0],
    ).toEqual({ weightKg: 70, reps: 8 });
  });
});

describe('cardioBody', () => {
  it('pasa los km a metros y omite lo vacío o absurdo', () => {
    expect(cardioBody({ distanceKm: '8,4', avgHr: '150', maxHr: '', elevation: '60' })).toEqual({
      distanceM: 8400,
      avgHeartRate: 150,
      elevationGainM: 60,
    });
    expect(cardioBody({ distanceKm: '0', avgHr: '400', maxHr: '10', elevation: '' })).toEqual({});
  });
});
