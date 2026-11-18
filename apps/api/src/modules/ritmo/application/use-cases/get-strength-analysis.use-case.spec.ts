/* eslint-disable @typescript-eslint/require-await -- dobles de los puertos: async para cumplir su contrato. */
import { GetStrengthAnalysisUseCase } from './get-strength-analysis.use-case';
import {
  exercise,
  session,
  sets,
} from '../../domain/services/performance/test-helpers';
import type { RitmoPerformanceRepositoryPort } from '../ports/ritmo-performance-repository.port';

const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};

function setup() {
  const performance = {
    trainingHistory: async () => [
      session(daysAgo(300), {
        sets: sets('jalon', [
          [50, 10],
          [52, 10],
        ]),
      }),
      session(daysAgo(20), {
        sets: sets('jalon', [
          [66, 8],
          [66, 10],
        ]),
      }),
      session(daysAgo(10), { sets: sets('remo', [[40, 12]]) }),
    ],
    listExercisesVisibleTo: async () => [
      exercise('jalon', [['LATS', 1]]),
      exercise('remo', [['LATS', 1]]),
      exercise('nuevo', [['CHEST', 1]]),
    ],
    missingExercises: async (ids: string[]) =>
      ids.filter((i) => !['jalon', 'remo', 'nuevo'].includes(i)),
  } as unknown as RitmoPerformanceRepositoryPort;
  return new GetStrengthAnalysisUseCase(
    performance,
    { latestWeightKg: async () => 80 } as never,
    { findByUserId: async () => ({ timezone: 'UTC' }) } as never,
  );
}

describe('progresión de un ejercicio', () => {
  it('devuelve sus sesiones del periodo, con carga más alta y repeticiones', async () => {
    const year = await setup().forExercise('u', 'jalon', '1y');
    expect(
      year.analysis?.history.map((p) => [p.day, p.topWeightKg, p.totalReps]),
    ).toEqual([
      [daysAgo(300), 52, 20],
      [daysAgo(20), 66, 18],
    ]);
    const month = await setup().forExercise('u', 'jalon', '30d');
    expect(month.analysis?.history).toHaveLength(1);
    // Las marcas miran todo el historial, no solo el periodo.
    expect(month.analysis?.heaviestKg).toBe(66);
  });

  it('sin series todavía, analysis es null', async () => {
    expect(await setup().forExercise('u', 'nuevo', '6m')).toEqual({
      exerciseId: 'nuevo',
      analysis: null,
    });
  });

  it('un ejercicio que no es suyo ni del catálogo da 404', async () => {
    await expect(setup().forExercise('u', 'ajeno', '6m')).rejects.toThrow(
      'Ejercicio ajeno no encontrado.',
    );
  });
});
