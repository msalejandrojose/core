import { ResumeDuePendingActionsUseCase } from './resume-due-pending-actions.use-case';

const dsl = (steps: unknown[]) => ({
  id: 'def-1',
  key: 'welcome',
  dsl: { key: 'welcome', name: 'W', version: 1, triggers: [], steps },
});

describe('ResumeDuePendingActionsUseCase', () => {
  let pending: {
    findDue: jest.Mock;
    markConsumed: jest.Mock;
    create: jest.Mock;
    findPendingWaitEvents: jest.Mock;
  };
  let runs: { findById: jest.Mock; update: jest.Mock };
  let definitions: { findById: jest.Mock };
  let advance: { execute: jest.Mock };
  let useCase: ResumeDuePendingActionsUseCase;

  const waitingRun = (over: Record<string, unknown> = {}) => ({
    id: 'run-1',
    definitionId: 'def-1',
    status: 'WAITING',
    currentStepKey: 's1',
    ...over,
  });

  beforeEach(() => {
    pending = {
      findDue: jest.fn().mockResolvedValue([]),
      markConsumed: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockResolvedValue({ id: 'pa-new' }),
      findPendingWaitEvents: jest.fn().mockResolvedValue([]),
    };
    runs = {
      findById: jest.fn().mockResolvedValue(waitingRun()),
      update: jest.fn().mockResolvedValue(undefined),
    };
    definitions = { findById: jest.fn() };
    advance = { execute: jest.fn().mockResolvedValue(undefined) };
    useCase = new ResumeDuePendingActionsUseCase(
      pending as never,
      runs as never,
      definitions as never,
      advance as never,
    );
  });

  it('pide las acciones diferidas vencidas (delay/retry/wait_condition)', async () => {
    const now = new Date();
    await useCase.execute(now, 25);
    expect(pending.findDue).toHaveBeenCalledWith({
      now,
      kinds: ['DELAY', 'RETRY', 'WAIT_CONDITION', 'WAIT_EVENT'],
      limit: 25,
    });
  });

  it('RETRY: pone el run en RUNNING y reintenta el mismo step', async () => {
    pending.findDue.mockResolvedValue([
      { id: 'pa-1', runId: 'run-1', kind: 'RETRY', stepKey: 's1' },
    ]);

    const resumed = await useCase.execute();

    expect(pending.markConsumed).toHaveBeenCalledWith('pa-1');
    expect(runs.update).toHaveBeenCalledWith('run-1', { status: 'RUNNING' });
    expect(advance.execute).toHaveBeenCalledWith('run-1');
    expect(resumed).toBe(1);
  });

  it('DELAY: avanza al step siguiente antes de continuar', async () => {
    pending.findDue.mockResolvedValue([
      { id: 'pa-2', runId: 'run-1', kind: 'DELAY', stepKey: 's1' },
    ]);
    definitions.findById.mockResolvedValue(
      dsl([
        { key: 's1', action: 'delay', next: 's2' },
        { key: 's2', action: 'log' },
      ]),
    );

    await useCase.execute();

    expect(runs.update).toHaveBeenCalledWith('run-1', {
      currentStepKey: 's2',
      status: 'RUNNING',
    });
    expect(advance.execute).toHaveBeenCalledWith('run-1');
  });

  it('DELAY en el último step: completa el run y no avanza', async () => {
    pending.findDue.mockResolvedValue([
      { id: 'pa-3', runId: 'run-1', kind: 'DELAY', stepKey: 's1' },
    ]);
    definitions.findById.mockResolvedValue(
      dsl([{ key: 's1', action: 'delay' }]),
    );

    await useCase.execute();

    expect(runs.update).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ currentStepKey: null, status: 'COMPLETED' }),
    );
    expect(advance.execute).not.toHaveBeenCalled();
  });

  it('acción ya consumida por otro: no toca el run', async () => {
    pending.findDue.mockResolvedValue([
      { id: 'pa-4', runId: 'run-1', kind: 'RETRY', stepKey: 's1' },
    ]);
    pending.markConsumed.mockResolvedValue(false);

    const resumed = await useCase.execute();

    expect(runs.findById).not.toHaveBeenCalled();
    expect(advance.execute).not.toHaveBeenCalled();
    expect(resumed).toBe(0);
  });

  it('run que ya no está en espera (cancelado/terminado): se descarta', async () => {
    pending.findDue.mockResolvedValue([
      { id: 'pa-5', runId: 'run-1', kind: 'RETRY', stepKey: 's1' },
    ]);
    runs.findById.mockResolvedValue(waitingRun({ status: 'CANCELED' }));

    const resumed = await useCase.execute();

    expect(runs.update).not.toHaveBeenCalled();
    expect(advance.execute).not.toHaveBeenCalled();
    expect(resumed).toBe(0);
  });

  const waitConditionDsl = () =>
    dsl([
      {
        key: 's1',
        action: 'wait_for_condition',
        input: { condition: { ready: true }, pollInterval: '30s' },
        onMatch: 's2',
        onTimeout: 's3',
      },
      { key: 's2', action: 'log' },
      { key: 's3', action: 'log' },
    ]);

  it('WAIT_CONDITION cumplida: sigue por onMatch', async () => {
    pending.findDue.mockResolvedValue([
      {
        id: 'pa-c1',
        runId: 'run-1',
        kind: 'WAIT_CONDITION',
        stepKey: 's1',
        matchExpression: { ready: true },
        deadlineAt: new Date(Date.now() + 60_000),
      },
    ]);
    runs.findById.mockResolvedValue(waitingRun({ context: { ready: true } }));
    definitions.findById.mockResolvedValue(waitConditionDsl());

    const resumed = await useCase.execute();

    expect(runs.update).toHaveBeenCalledWith('run-1', {
      currentStepKey: 's2',
      status: 'RUNNING',
    });
    expect(advance.execute).toHaveBeenCalledWith('run-1');
    expect(resumed).toBe(1);
  });

  it('WAIT_CONDITION vencida sin cumplirse: sigue por onTimeout', async () => {
    pending.findDue.mockResolvedValue([
      {
        id: 'pa-c2',
        runId: 'run-1',
        kind: 'WAIT_CONDITION',
        stepKey: 's1',
        matchExpression: { ready: true },
        deadlineAt: new Date(Date.now() - 1000), // ya vencida
      },
    ]);
    runs.findById.mockResolvedValue(waitingRun({ context: { ready: false } }));
    definitions.findById.mockResolvedValue(waitConditionDsl());

    await useCase.execute(new Date());

    expect(runs.update).toHaveBeenCalledWith('run-1', {
      currentStepKey: 's3',
      status: 'RUNNING',
    });
    expect(advance.execute).toHaveBeenCalledWith('run-1');
  });

  it('WAIT_CONDITION sin cumplir y sin vencer: reprograma el siguiente poll y sigue en espera', async () => {
    const deadline = new Date(Date.now() + 3_600_000);
    pending.findDue.mockResolvedValue([
      {
        id: 'pa-c3',
        runId: 'run-1',
        kind: 'WAIT_CONDITION',
        stepKey: 's1',
        matchExpression: { ready: true },
        deadlineAt: deadline,
      },
    ]);
    runs.findById.mockResolvedValue(waitingRun({ context: { ready: false } }));
    definitions.findById.mockResolvedValue(waitConditionDsl());

    const resumed = await useCase.execute();

    // No avanza el run; crea un nuevo poll con el mismo deadline.
    expect(runs.update).not.toHaveBeenCalled();
    expect(advance.execute).not.toHaveBeenCalled();
    expect(pending.create).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        stepKey: 's1',
        kind: 'WAIT_CONDITION',
        deadlineAt: deadline,
      }),
    );
    expect(resumed).toBe(0);
  });

  const waitEventDsl = () =>
    dsl([
      { key: 's1', action: 'wait_for_event', onMatch: 's2', onTimeout: 's3' },
      { key: 's2', action: 'log' },
      { key: 's3', action: 'log' },
    ]);

  it('WAIT_EVENT vencido (sin llegar el evento): sigue por onTimeout', async () => {
    pending.findDue.mockResolvedValue([
      { id: 'pa-e1', runId: 'run-1', kind: 'WAIT_EVENT', stepKey: 's1' },
    ]);
    definitions.findById.mockResolvedValue(waitEventDsl());

    const resumed = await useCase.execute();

    expect(runs.update).toHaveBeenCalledWith('run-1', {
      currentStepKey: 's3',
      status: 'RUNNING',
    });
    expect(advance.execute).toHaveBeenCalledWith('run-1');
    expect(resumed).toBe(1);
  });

  describe('resumeMatchingWaitEvents', () => {
    const event = {
      id: 'ev-1',
      type: 'order.paid',
      payload: { orderId: 'o-1' },
    } as never;

    it('evento que casa: consume la acción y avanza por onMatch', async () => {
      pending.findPendingWaitEvents.mockResolvedValue([
        {
          id: 'pa-w1',
          runId: 'run-1',
          kind: 'WAIT_EVENT',
          stepKey: 's1',
          matchExpression: { orderId: 'o-1' },
        },
      ]);
      definitions.findById.mockResolvedValue(waitEventDsl());

      const resumed = await useCase.resumeMatchingWaitEvents(event);

      expect(pending.markConsumed).toHaveBeenCalledWith('pa-w1', 'ev-1');
      expect(runs.update).toHaveBeenCalledWith('run-1', {
        currentStepKey: 's2',
        status: 'RUNNING',
      });
      expect(advance.execute).toHaveBeenCalledWith('run-1');
      expect(resumed).toBe(1);
    });

    it('evento que NO casa el match: no consume ni avanza', async () => {
      pending.findPendingWaitEvents.mockResolvedValue([
        {
          id: 'pa-w2',
          runId: 'run-1',
          kind: 'WAIT_EVENT',
          stepKey: 's1',
          matchExpression: { orderId: 'otro' },
        },
      ]);

      const resumed = await useCase.resumeMatchingWaitEvents(event);

      expect(pending.markConsumed).not.toHaveBeenCalled();
      expect(advance.execute).not.toHaveBeenCalled();
      expect(resumed).toBe(0);
    });

    it('run que ya no espera: se descarta (0 reanudados)', async () => {
      pending.findPendingWaitEvents.mockResolvedValue([
        {
          id: 'pa-w3',
          runId: 'run-1',
          kind: 'WAIT_EVENT',
          stepKey: 's1',
          matchExpression: null,
        },
      ]);
      runs.findById.mockResolvedValue(waitingRun({ status: 'COMPLETED' }));
      definitions.findById.mockResolvedValue(waitEventDsl());

      const resumed = await useCase.resumeMatchingWaitEvents(event);

      expect(advance.execute).not.toHaveBeenCalled();
      expect(resumed).toBe(0);
    });
  });

  it('un fallo al reanudar una acción no corta el resto del lote', async () => {
    pending.findDue.mockResolvedValue([
      { id: 'pa-a', runId: 'run-a', kind: 'RETRY', stepKey: 's1' },
      { id: 'pa-b', runId: 'run-b', kind: 'RETRY', stepKey: 's1' },
    ]);
    runs.findById
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValue(waitingRun({ id: 'run-b' }));

    const resumed = await useCase.execute();

    expect(advance.execute).toHaveBeenCalledWith('run-b');
    expect(resumed).toBe(1);
  });
});
