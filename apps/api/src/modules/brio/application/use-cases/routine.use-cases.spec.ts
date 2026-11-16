/* eslint-disable @typescript-eslint/require-await -- dobles de prueba */
import { HevyApiError } from '../ports/hevy.port';
import type { RoutineView } from '../ports/routine.port';
import {
  SendRoutineToHevyUseCase,
  SyncRoutineWithGarminUseCase,
} from './routine.use-cases';

const USER = 'u1';

const routine = (over: Partial<RoutineView> = {}): RoutineView => ({
  id: 'r1',
  name: 'Torso A',
  kind: 'STRENGTH',
  notes: null,
  plannedDurationMin: null,
  plannedDistanceM: null,
  targetPaceSecPerKm: null,
  hevyRoutineId: null,
  hevySentAt: null,
  exercises: [
    {
      exerciseId: 'e-bench',
      code: 'bench_press',
      name: 'Press de banca',
      sets: 3,
      reps: 8,
      weightKg: 70,
      restSec: 120,
      muscles: [{ muscle: 'CHEST', weight: 1 }],
    },
  ],
  lastDoneAt: null,
  timesDone: 0,
  ...over,
});

function hevySetup(r: RoutineView, updateFails?: number) {
  const saved: (string | null)[] = [];
  const routines = {
    get: async () => r,
    setHevyRoutine: async (_id: string, h: string | null) => {
      saved.push(h);
    },
  };
  const hevy = {
    getConnection: async () => ({ apiKeyEnc: 'enc' }),
    links: async () => [{ templateId: 'T-BENCH', exerciseId: 'e-bench' }],
    saveLink: async () => undefined,
  };
  const client = {
    createRoutine: jest.fn().mockResolvedValue({ id: 'H-NEW' }),
    updateRoutine: jest.fn().mockImplementation(async () => {
      if (updateFails) throw new HevyApiError(updateFails);
    }),
    exerciseTemplates: jest.fn(),
  };
  const useCase = new SendRoutineToHevyUseCase(
    routines as never,
    hevy as never,
    client as never,
    { decrypt: () => 'KEY', encrypt: (s: string) => s },
  );
  return { useCase, client, saved };
}

describe('SendRoutineToHevyUseCase', () => {
  it('la primera vez crea la rutina en Hevy y guarda su id', async () => {
    const t = hevySetup(routine());
    const r = await t.useCase.execute(USER, 'r1');
    expect(r).toEqual({
      hevyRoutineId: 'H-NEW',
      updated: false,
      exercises: 1,
      skipped: [],
    });
    expect(t.client.createRoutine).toHaveBeenCalledWith('KEY', {
      title: 'Torso A',
      notes: 'Rutina de Brío',
      exercises: [expect.objectContaining({ exercise_template_id: 'T-BENCH' })],
    });
    expect(t.saved).toEqual(['H-NEW']);
  });

  it('si ya estaba en Hevy, la actualiza', async () => {
    const t = hevySetup(routine({ hevyRoutineId: 'H1' }));
    const r = await t.useCase.execute(USER, 'r1');
    expect(r.updated).toBe(true);
    expect(t.client.createRoutine).not.toHaveBeenCalled();
  });

  it('si se borró en Hevy, crea otra', async () => {
    const t = hevySetup(routine({ hevyRoutineId: 'H1' }), 404);
    const r = await t.useCase.execute(USER, 'r1');
    expect(r).toMatchObject({ hevyRoutineId: 'H-NEW', updated: false });
  });

  it('no manda rutinas de cardio', async () => {
    const t = hevySetup(routine({ kind: 'RUN', exercises: [] }));
    await expect(t.useCase.execute(USER, 'r1')).rejects.toThrow(
      'BRIO_HEVY_NOT_STRENGTH',
    );
  });
});

describe('SyncRoutineWithGarminUseCase', () => {
  it('sincroniza Garmin y enlaza el último entreno de esa disciplina', async () => {
    const linked: string[] = [];
    const routines = {
      get: async () => routine({ kind: 'RUN', exercises: [] }),
      unlinkedGarminSessions: async () => [
        { id: 's-bike', startedAt: new Date(), kind: 'CYCLE' },
        { id: 's-run', startedAt: new Date(), kind: 'RUN' },
      ],
      linkSession: async (_u: string, sessionId: string) => {
        linked.push(sessionId);
        return true;
      },
    };
    const garmin = {
      execute: async () => ({
        imported: 2,
        updated: 0,
        skipped: 0,
        healthDays: 1,
      }),
    };
    const useCase = new SyncRoutineWithGarminUseCase(
      routines as never,
      garmin as never,
    );
    const r = await useCase.execute(USER, 'r1');
    expect(r.linkedSessionId).toBe('s-run');
    expect(linked).toEqual(['s-run']);
  });

  it('las de gimnasio no se sincronizan con Garmin', async () => {
    const useCase = new SyncRoutineWithGarminUseCase(
      { get: async () => routine() } as never,
      { execute: jest.fn() } as never,
    );
    await expect(useCase.execute(USER, 'r1')).rejects.toThrow(
      'BRIO_ROUTINE_NOT_CARDIO',
    );
  });
});
