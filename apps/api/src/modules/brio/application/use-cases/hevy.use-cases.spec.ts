/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method -- dobles de prueba: métodos async sin await y mocks de jest */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { HevyTemplate, HevyWorkout } from '../../domain/services/hevy';
import {
  HevyApiError,
  type HevyClientPort,
  type HevyConnection,
  type ImportedSessionData,
  type BrioHevyRepositoryPort,
  type StrengthSessionWithSets,
} from '../ports/hevy.port';
import {
  ConnectHevyUseCase,
  SendPlannedRoutineToHevyUseCase,
  SyncHevyUseCase,
} from './hevy.use-cases';

const USER = 'u1';
const cipher = {
  encrypt: (s: string) => `enc(${s})`,
  decrypt: (s: string) => s.replace(/^enc\((.*)\)$/, '$1'),
};

const TEMPLATES: HevyTemplate[] = [
  {
    id: 'T-bench',
    title: 'Bench Press (Barbell)',
    type: 'weight_reps',
    primary_muscle_group: 'chest',
    secondary_muscle_groups: ['triceps'],
    is_custom: false,
  },
  {
    id: 'T-odd',
    title: 'Zottman Curl (Dumbbell)',
    type: 'weight_reps',
    primary_muscle_group: 'biceps',
    secondary_muscle_groups: ['forearms'],
    is_custom: false,
  },
  {
    id: 'T-squat',
    title: 'Squat (Barbell)',
    type: 'weight_reps',
    primary_muscle_group: 'quadriceps',
    secondary_muscle_groups: [],
    is_custom: false,
  },
];

const workout = (
  id: string,
  templateId: string,
  title: string,
): HevyWorkout => ({
  id,
  title: 'Torso',
  description: null,
  start_time: '2026-11-10T18:00:00Z',
  end_time: '2026-11-10T19:00:00Z',
  exercises: [
    {
      index: 0,
      title,
      exercise_template_id: templateId,
      sets: [{ index: 0, type: 'normal', weight_kg: 80, reps: 8, rpe: null }],
    },
  ],
});

function fakes(initial: Partial<HevyConnection> | null = {}) {
  let conn: HevyConnection | null = initial
    ? {
        apiKeyEnc: 'enc(KEY)',
        username: 'ana',
        lastSyncAt: null,
        lastSyncCount: null,
        lastError: null,
        ...initial,
      }
    : null;
  const links = new Map<string, string>();
  const imported = new Map<string, ImportedSessionData>();
  const own: string[] = [];
  let planned: {
    kind: string;
    title: string;
    templateCode: string | null;
    structure: Record<string, unknown> | null;
  } | null = null;
  let sessions: StrengthSessionWithSets[] = [];

  const repo: BrioHevyRepositoryPort = {
    getConnection: async () => conn,
    saveConnection: async (_u, d) => {
      conn = { ...d, lastSyncAt: null, lastSyncCount: null, lastError: null };
    },
    deleteConnection: async () => {
      conn = null;
    },
    markSync: async (_u, d) => {
      if (conn) conn = { ...conn, ...d };
    },
    countImported: async () => imported.size,
    links: async () =>
      [...links].map(([templateId, exerciseId]) => ({
        templateId,
        exerciseId,
      })),
    saveLink: async (_u, t, e) => {
      links.set(t, e);
    },
    catalog: async () => [
      { id: 'EX-bench', code: 'bench_press' },
      { id: 'EX-squat', code: 'back_squat' },
    ],
    ensureOwnExercise: async (_u, d) => {
      own.push(d.name);
      return `OWN-${d.name}`;
    },
    strengthType: async () => ({ id: 'TYPE', met: 5 }),
    upsertImported: async (_u, id, d) => {
      const created = !imported.has(id);
      imported.set(id, d);
      return { created, previousDay: created ? null : d.loggedOn };
    },
    deleteImported: async (_u, id) =>
      imported.delete(id) ? '2026-11-10' : null,
    recentStrengthSessions: async () => sessions,
    getPlanned: async () => planned,
    savePlannedStructure: async (_u, _d, s) => {
      if (planned) planned = { ...planned, structure: s };
    },
  };

  const client: jest.Mocked<HevyClientPort> = {
    userInfo: jest.fn().mockResolvedValue({ username: 'ana' }),
    workouts: jest.fn().mockResolvedValue({ pageCount: 1, items: [] }),
    workoutEvents: jest.fn().mockResolvedValue({ pageCount: 1, items: [] }),
    exerciseTemplates: jest
      .fn()
      .mockResolvedValue({ pageCount: 1, items: TEMPLATES }),
    createRoutine: jest.fn().mockResolvedValue({ id: 'R1' }),
  };
  const refresh = { execute: jest.fn() };
  const sync = new SyncHevyUseCase(
    repo,
    client,
    cipher,
    { latestWeightKg: async () => 80 } as never,
    { findByUserId: async () => ({ timezone: 'Europe/Madrid' }) } as never,
    refresh as never,
  );
  return {
    repo,
    client,
    sync,
    refresh,
    links,
    imported,
    own,
    conn: () => conn,
    setPlanned: (p: typeof planned) => (planned = p),
    planned: () => planned,
    setSessions: (s: StrengthSessionWithSets[]) => (sessions = s),
  };
}

describe('SyncHevyUseCase', () => {
  it('la primera vez importa el historial y enlaza o crea los ejercicios', async () => {
    const f = fakes();
    f.client.workouts.mockResolvedValue({
      pageCount: 1,
      items: [
        workout('w1', 'T-bench', 'Bench Press (Barbell)'),
        workout('w2', 'T-odd', 'Zottman Curl (Dumbbell)'),
      ],
    });

    const r = await f.sync.execute(USER);

    expect(r).toEqual({
      imported: 2,
      updated: 0,
      deleted: 0,
      truncated: false,
    });
    expect(f.client.workouts).toHaveBeenCalledWith('KEY', 1);
    expect(f.links.get('T-bench')).toBe('EX-bench');
    expect(f.own).toEqual(['Zottman Curl (Dumbbell)']);
    const w1 = f.imported.get('w1')!;
    expect(w1.loggedOn).toBe('2026-11-10');
    expect(w1.durationSec).toBe(3600);
    expect(w1.kcalBurned).toBe(420);
    expect(w1.sets).toHaveLength(1);
    expect(w1.sets[0].exerciseId).toBe('EX-bench');
    expect(f.refresh.execute).toHaveBeenCalledWith(USER, '2026-11-10');
    expect(f.conn()?.lastSyncAt).toBeInstanceOf(Date);
    expect(f.conn()?.lastSyncCount).toBe(2);
  });

  it('después solo pide los cambios, y aplica los borrados', async () => {
    const since = new Date('2026-11-11T00:00:00Z');
    const f = fakes({ lastSyncAt: since });
    f.imported.set('gone', {} as ImportedSessionData);
    f.client.workoutEvents.mockResolvedValue({
      pageCount: 1,
      items: [
        {
          type: 'updated',
          workout: workout('w1', 'T-bench', 'Bench Press (Barbell)'),
        },
        { type: 'deleted', id: 'gone' },
        { type: 'deleted', id: 'never-imported' },
      ],
    });

    const r = await f.sync.execute(USER);

    expect(f.client.workouts).not.toHaveBeenCalled();
    expect(f.client.workoutEvents).toHaveBeenCalledWith('KEY', since, 1);
    expect(r).toEqual({
      imported: 1,
      updated: 0,
      deleted: 1,
      truncated: false,
    });
    expect(f.imported.has('gone')).toBe(false);
  });

  it('no vuelve a pedir el catálogo de Hevy si ya conoce los ejercicios', async () => {
    const f = fakes();
    f.links.set('T-bench', 'EX-bench');
    f.client.workouts.mockResolvedValue({
      pageCount: 1,
      items: [workout('w1', 'T-bench', 'Bench Press (Barbell)')],
    });
    await f.sync.execute(USER);
    expect(f.client.exerciseTemplates).not.toHaveBeenCalled();
  });

  it('una clave rechazada se explica y queda apuntada, sin perder la conexión', async () => {
    const f = fakes();
    f.client.workouts.mockRejectedValue(new HevyApiError(401));
    await expect(f.sync.execute(USER)).rejects.toThrow('BRIO_HEVY_KEY_INVALID');
    expect(f.conn()?.lastError).toBe('HEVY_401');
    expect(f.conn()?.lastSyncAt).toBeNull();
  });

  it('sin conexión no hace nada', async () => {
    const f = fakes(null);
    await expect(f.sync.execute(USER)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('ConnectHevyUseCase', () => {
  it('comprueba la clave, la guarda cifrada e importa', async () => {
    const f = fakes(null);
    const connect = new ConnectHevyUseCase(f.repo, f.client, cipher, f.sync);
    const r = await connect.execute(USER, '  NEWKEY-1234567  ', true);
    expect(f.client.userInfo).toHaveBeenCalledWith('NEWKEY-1234567');
    expect(f.conn()?.apiKeyEnc).toBe('enc(NEWKEY-1234567)');
    expect(r).toEqual({
      imported: 0,
      updated: 0,
      deleted: 0,
      truncated: false,
    });
  });

  it('no guarda una clave que Hevy rechaza', async () => {
    const f = fakes(null);
    f.client.userInfo.mockRejectedValue(new HevyApiError(401));
    const connect = new ConnectHevyUseCase(f.repo, f.client, cipher, f.sync);
    await expect(
      connect.execute(USER, 'BADKEY-1234567', true),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(f.conn()).toBeNull();
  });
});

describe('SendPlannedRoutineToHevyUseCase', () => {
  const set = (exerciseId: string, code: string | null, muscle: string) => ({
    exerciseId,
    exerciseOrder: 0,
    setOrder: 0,
    weightKg: 80,
    reps: 8,
    rir: null,
    restSec: null,
    isWarmup: false,
    exerciseName: exerciseId,
    exerciseCode: code,
    primaryMuscle: muscle,
  });
  const upper: StrengthSessionWithSets = {
    id: 'S-upper',
    day: '2026-11-12',
    sets: [set('EX-bench', 'bench_press', 'CHEST')],
  };
  const lower: StrengthSessionWithSets = {
    id: 'S-lower',
    day: '2026-11-08',
    sets: [set('EX-squat', 'back_squat', 'QUADS')],
  };

  it('copia el último entreno de pierna para una sesión de pierna', async () => {
    const f = fakes();
    f.setPlanned({
      kind: 'STRENGTH',
      title: 'Fuerza · pierna y core',
      templateCode: 'fpie',
      structure: null,
    });
    f.setSessions([upper, lower]);
    const send = new SendPlannedRoutineToHevyUseCase(f.repo, f.client, cipher);

    const r = await send.execute(USER, '2026-11-14');

    expect(r).toMatchObject({
      routineId: 'R1',
      exercises: 1,
      skipped: [],
      basedOnSessionId: 'S-lower',
    });
    expect(f.client.createRoutine).toHaveBeenCalledWith(
      'KEY',
      expect.objectContaining({
        title: 'Fuerza · pierna y core',
        exercises: [
          expect.objectContaining({ exercise_template_id: 'T-squat' }),
        ],
      }),
    );
    expect(f.links.get('T-squat')).toBe('EX-squat');
    expect(f.planned()?.structure).toMatchObject({ hevyRoutineId: 'R1' });
  });

  it('rechaza sesiones que no son de fuerza o sin entreno del que copiar', async () => {
    const f = fakes();
    const send = new SendPlannedRoutineToHevyUseCase(f.repo, f.client, cipher);
    f.setPlanned({
      kind: 'RUN',
      title: 'Rodaje',
      templateCode: 'z2',
      structure: null,
    });
    await expect(send.execute(USER, '2026-11-14')).rejects.toThrow(
      'BRIO_HEVY_NOT_STRENGTH',
    );
    f.setPlanned({
      kind: 'STRENGTH',
      title: 'Fuerza',
      templateCode: null,
      structure: null,
    });
    await expect(send.execute(USER, '2026-11-14')).rejects.toThrow(
      'BRIO_HEVY_NO_SOURCE_SESSION',
    );
    expect(f.client.createRoutine).not.toHaveBeenCalled();
  });

  it('avisa si ningún ejercicio existe en Hevy', async () => {
    const f = fakes();
    f.setPlanned({
      kind: 'STRENGTH',
      title: 'Fuerza',
      templateCode: null,
      structure: null,
    });
    f.setSessions([
      { id: 'S', day: '2026-11-12', sets: [set('OWN', null, 'CHEST')] },
    ]);
    const send = new SendPlannedRoutineToHevyUseCase(f.repo, f.client, cipher);
    await expect(send.execute(USER, '2026-11-14')).rejects.toThrow(
      'BRIO_HEVY_NO_MATCHING_EXERCISES',
    );
  });
});
