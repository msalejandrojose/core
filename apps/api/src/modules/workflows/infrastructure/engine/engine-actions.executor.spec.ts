import { EngineActionsExecutor } from './engine-actions.executor';
import { WorkflowRun } from '../../domain/entities/workflow-run.entity';
import { WorkflowDsl } from '../../domain/dsl/workflow-dsl';

const dsl: WorkflowDsl = {
  key: 'w',
  name: 'W',
  version: 1,
  triggers: [{ kind: 'manual' }],
  steps: [
    {
      key: 's1',
      action: 'wait_for_condition',
      onMatch: 's2',
      onTimeout: 's3',
    },
    { key: 's2', action: 'log' },
    { key: 's3', action: 'log' },
  ],
} as unknown as WorkflowDsl;

const step = dsl.steps[0];

const makeRun = (
  context: Record<string, unknown>,
  isDryRun = false,
): WorkflowRun =>
  ({ id: 'run-1', context, isDryRun }) as unknown as WorkflowRun;

describe('EngineActionsExecutor · wait_for_condition', () => {
  let pending: { create: jest.Mock };
  let events: { create: jest.Mock };
  let executor: EngineActionsExecutor;

  beforeEach(() => {
    pending = { create: jest.fn().mockResolvedValue({ id: 'pa-1' }) };
    events = { create: jest.fn() };
    executor = new EngineActionsExecutor(pending as never, events as never);
  });

  it('condición ya cumplida: continúa por onMatch sin crear pending', async () => {
    const result = await executor.execute(
      step,
      { condition: { ready: true } },
      makeRun({ ready: true }),
      dsl,
    );

    expect(result).toMatchObject({ kind: 'continue', nextStepKey: 's2' });
    expect(pending.create).not.toHaveBeenCalled();
  });

  it('condición no cumplida: pausa y programa un WAIT_CONDITION con deadline', async () => {
    const result = await executor.execute(
      step,
      { condition: { ready: true }, timeout: '10m', pollInterval: '30s' },
      makeRun({ ready: false }),
      dsl,
    );

    expect(result.kind).toBe('pause');
    expect(pending.create).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        stepKey: 's1',
        kind: 'WAIT_CONDITION',
        matchExpression: { ready: true },
      }),
    );
    const arg = (
      pending.create.mock.calls[0] as [{ runAt: Date; deadlineAt: Date }]
    )[0];
    expect(arg.deadlineAt).toBeInstanceOf(Date);
    // El siguiente poll no sobrepasa el deadline.
    expect(arg.runAt.getTime()).toBeLessThanOrEqual(arg.deadlineAt.getTime());
  });

  it('dry-run: no espera, continúa por onMatch', async () => {
    const result = await executor.execute(
      step,
      { condition: { ready: true } },
      makeRun({ ready: false }, true),
      dsl,
    );

    expect(result).toMatchObject({ kind: 'continue', nextStepKey: 's2' });
    expect(pending.create).not.toHaveBeenCalled();
  });
});
