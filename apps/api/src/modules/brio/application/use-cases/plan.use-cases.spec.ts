import type { PlannedSession } from '../../domain/entities/plan.entity';
import type { BrioActivityRepositoryPort } from '../ports/brio-activity-repository.port';
import type {
  PlannedSessionData,
  BrioPlanRepositoryPort,
} from '../ports/brio-plan-repository.port';
import {
  CompletePlannedDayUseCase,
  FillPlanWeekUseCase,
  fromTemplate,
} from './plan.use-cases';

const session = (day: string, title: string): PlannedSession => ({
  id: `p-${day}`,
  planId: null,
  day,
  kind: 'RUN',
  templateCode: null,
  title,
  load: 'MEDIUM',
  startTime: '07:30',
  plannedDurationMin: 40,
  plannedDistanceM: null,
  targetPaceSecPerKm: null,
  structure: null,
  notes: null,
  completedAt: null,
  completedSessionId: null,
  actualNotes: null,
  skipped: false,
});

function plans(existing: PlannedSession[]) {
  const upsert = jest
    .fn<
      Promise<PlannedSession>,
      [string, string, string | null, PlannedSessionData]
    >()
    .mockImplementation((_u, day, _p, data) =>
      Promise.resolve({ ...session(day, data.title), ...data }),
    );
  const repo = {
    findActivePlan: jest.fn().mockResolvedValue({ id: 'plan-1' }),
    plannedBetween: jest
      .fn()
      .mockImplementation((_u: string, from: string, to: string) =>
        Promise.resolve(existing.filter((p) => p.day >= from && p.day <= to)),
      ),
    upsertPlanned: upsert,
    setCompletion: jest.fn(),
  } as unknown as BrioPlanRepositoryPort;
  return { repo, upsert };
}

describe('fromTemplate', () => {
  it('parte de la plantilla y aplica los cambios', () => {
    expect(
      fromTemplate('series', { plannedDurationMin: 60, startTime: '07:30' }),
    ).toMatchObject({
      kind: 'RUN',
      load: 'HIGH',
      templateCode: 'series',
      plannedDurationMin: 60,
      startTime: '07:30',
    });
    expect(fromTemplate('nope')).toBeNull();
  });
});

describe('FillPlanWeekUseCase', () => {
  it('con la semana tipo solo rellena los días vacíos', async () => {
    const { repo, upsert } = plans([session('2026-11-10', 'Mi rodaje')]);
    const written = await new FillPlanWeekUseCase(repo).execute(
      'u1',
      '2026-11-12',
      'TEMPLATE',
      false,
    );
    expect(written).toBe(6);
    expect(upsert.mock.calls.map((c) => c[1])).not.toContain('2026-11-10');
    expect(upsert.mock.calls[0]).toEqual([
      'u1',
      '2026-11-09',
      'plan-1',
      expect.objectContaining({ templateCode: 'fsup' }),
    ]);
  });

  it('con sustituir, pisa también los días ocupados', async () => {
    const { repo } = plans([session('2026-11-10', 'Mi rodaje')]);
    expect(
      await new FillPlanWeekUseCase(repo).execute(
        'u1',
        '2026-11-12',
        'TEMPLATE',
        true,
      ),
    ).toBe(7);
  });

  it('repite la semana anterior día a día', async () => {
    const { repo, upsert } = plans([
      session('2026-11-03', 'Rodaje del martes'),
      session('2026-11-07', 'Tirada del sábado'),
    ]);
    const written = await new FillPlanWeekUseCase(repo).execute(
      'u1',
      '2026-11-12',
      'COPY_PREVIOUS',
      false,
    );
    expect(written).toBe(2);
    expect(upsert.mock.calls.map((c) => [c[1], c[3].title])).toEqual([
      ['2026-11-10', 'Rodaje del martes'],
      ['2026-11-14', 'Tirada del sábado'],
    ]);
  });
});

describe('CompletePlannedDayUseCase', () => {
  const setup = (found: boolean, sessionExists = true) => {
    const setCompletion = jest
      .fn()
      .mockResolvedValue(found ? session('2026-11-10', 'Rodaje') : null);
    const repo = { setCompletion } as unknown as BrioPlanRepositoryPort;
    const activity = {
      findSession: jest
        .fn()
        .mockResolvedValue(sessionExists ? { id: 's1' } : null),
    } as unknown as BrioActivityRepositoryPort;
    return {
      useCase: new CompletePlannedDayUseCase(repo, activity),
      setCompletion,
    };
  };

  it('marca como hecha con el entreno y las notas reales', async () => {
    const { useCase, setCompletion } = setup(true);
    await useCase.execute('u1', '2026-11-10', {
      done: true,
      sessionId: 's1',
      actualNotes: ' 8 km a 5:10 ',
    });
    expect(setCompletion).toHaveBeenCalledWith(
      'u1',
      '2026-11-10',
      expect.objectContaining({
        completedSessionId: 's1',
        actualNotes: '8 km a 5:10',
        skipped: false,
      }),
    );
    const call = setCompletion.mock.calls[0] as [
      string,
      string,
      { completedAt: Date | null },
    ];
    expect(call[2].completedAt).toBeInstanceOf(Date);
  });

  it('quitar el check limpia el enlace y permite marcarla como saltada', async () => {
    const { useCase, setCompletion } = setup(true);
    await useCase.execute('u1', '2026-11-10', {
      done: false,
      skipped: true,
      sessionId: null,
    });
    expect(setCompletion).toHaveBeenCalledWith('u1', '2026-11-10', {
      completedAt: null,
      completedSessionId: null,
      actualNotes: null,
      skipped: true,
    });
  });

  it('no enlaza un entreno que no es del usuario', async () => {
    const { useCase } = setup(true, false);
    await expect(
      useCase.execute('u1', '2026-11-10', { done: true, sessionId: 's1' }),
    ).rejects.toThrow('no encontrada');
  });

  it('falla si ese día no hay nada planificado', async () => {
    const { useCase } = setup(false);
    await expect(
      useCase.execute('u1', '2026-11-10', { done: true }),
    ).rejects.toThrow('BRIO_PLANNED_SESSION_NOT_FOUND');
  });
});
