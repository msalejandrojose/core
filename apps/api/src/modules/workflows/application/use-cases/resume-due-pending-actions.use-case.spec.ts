import { ResumeDuePendingActionsUseCase } from './resume-due-pending-actions.use-case';

const dsl = (steps: unknown[]) => ({
  id: 'def-1',
  key: 'welcome',
  dsl: { key: 'welcome', name: 'W', version: 1, triggers: [], steps },
});

describe('ResumeDuePendingActionsUseCase', () => {
  let pending: { findDue: jest.Mock; markConsumed: jest.Mock };
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

  it('solo pide acciones DELAY y RETRY vencidas', async () => {
    const now = new Date();
    await useCase.execute(now, 25);
    expect(pending.findDue).toHaveBeenCalledWith({
      now,
      kinds: ['DELAY', 'RETRY'],
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
