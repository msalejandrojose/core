import { StartWorkflowRunsUseCase } from './start-workflow-runs.use-case';
import { WorkflowDefinition } from '../../domain/entities/workflow-definition.entity';
import { WorkflowEvent } from '../../domain/entities/event.entity';

function makeDefinition(
  overrides: Partial<{ maxConcurrentRuns: number; context: object }> = {},
): WorkflowDefinition {
  return {
    id: 'def-1',
    key: 'welcome',
    version: 1,
    name: 'Welcome',
    description: null,
    isActive: true,
    createdAt: new Date(),
    publishedAt: new Date(),
    dsl: {
      key: 'welcome',
      name: 'Welcome',
      version: 1,
      meta:
        overrides.maxConcurrentRuns != null
          ? { maxConcurrentRuns: overrides.maxConcurrentRuns }
          : undefined,
      context: overrides.context ?? { seed: 1 },
      triggers: [{ kind: 'manual' }],
      steps: [{ key: 's1', action: 'log' }],
    },
  } as unknown as WorkflowDefinition;
}

const event = {
  id: 'ev-1',
  type: 'workflow.manual.welcome',
  payload: {},
  sourceUserId: null,
  correlationId: null,
  occurredAt: new Date(),
} as unknown as WorkflowEvent;

describe('StartWorkflowRunsUseCase', () => {
  let runs: {
    create: jest.Mock;
    findById: jest.Mock;
    countActiveByDefinition: jest.Mock;
  };
  let pending: { create: jest.Mock };
  let targets: { resolve: jest.Mock };
  let enrichers: { enrich: jest.Mock };
  let advance: { execute: jest.Mock };
  let useCase: StartWorkflowRunsUseCase;

  // Lectores tipados de los argumentos con los que se llamó al enricher.
  const enrichBase = (n: number) =>
    (enrichers.enrich.mock.calls[n] as [Record<string, unknown>, unknown])[0];
  const enrichCtx = (n: number) =>
    (
      enrichers.enrich.mock.calls[n] as [
        unknown,
        { target: { id: string } | null },
      ]
    )[1];

  beforeEach(() => {
    let seq = 0;
    runs = {
      create: jest.fn().mockImplementation((data: Record<string, unknown>) => {
        const id = `run-${++seq}`;
        return Promise.resolve({ id, ...data, status: 'RUNNING' });
      }),
      findById: jest
        .fn()
        .mockImplementation((id: string) =>
          Promise.resolve({ id, status: 'COMPLETED' }),
        ),
      countActiveByDefinition: jest.fn().mockResolvedValue(0),
    };
    pending = { create: jest.fn().mockResolvedValue({ id: 'pa-1' }) };
    targets = { resolve: jest.fn() };
    enrichers = {
      enrich: jest.fn().mockResolvedValue({ enriched: true }),
    };
    advance = { execute: jest.fn().mockResolvedValue(undefined) };

    useCase = new StartWorkflowRunsUseCase(
      runs as never,
      pending as never,
      targets as never,
      enrichers as never,
      advance as never,
    );
  });

  it('sin target: crea un único run y lo avanza (no resuelve targets)', async () => {
    const created = await useCase.execute({
      definition: makeDefinition(),
      event,
      triggerKind: 'manual',
    });

    expect(targets.resolve).not.toHaveBeenCalled();
    expect(runs.create).toHaveBeenCalledTimes(1);
    expect(advance.execute).toHaveBeenCalledTimes(1);
    expect(created).toHaveLength(1);
    // El enricher recibe target null en este caso.
    expect(enrichCtx(0)).toMatchObject({ target: null });
  });

  it('con target: fan-out de un run por entidad resuelta', async () => {
    targets.resolve.mockResolvedValue([
      { id: 'u1', entityType: 'user', data: { id: 'u1' } },
      { id: 'u2', entityType: 'user', data: { id: 'u2' } },
    ]);

    const created = await useCase.execute({
      definition: makeDefinition(),
      event,
      triggerKind: 'cron',
      target: { type: 'users' },
    });

    expect(targets.resolve).toHaveBeenCalledWith({ type: 'users' });
    expect(runs.create).toHaveBeenCalledTimes(2);
    expect(advance.execute).toHaveBeenCalledTimes(2);
    expect(created).toHaveLength(2);
    // Cada run se enriquece con SU target.
    expect(enrichCtx(0).target).toMatchObject({ id: 'u1' });
    expect(enrichCtx(1).target).toMatchObject({ id: 'u2' });
  });

  it('pasa el context base del DSL como semilla del enriquecimiento', async () => {
    await useCase.execute({
      definition: makeDefinition({ context: { foo: 'bar' } }),
      event,
      triggerKind: 'manual',
    });
    expect(enrichBase(0)).toEqual({ foo: 'bar' });
  });

  it('respeta maxConcurrentRuns: encola PENDING_START en vez de crear run', async () => {
    runs.countActiveByDefinition.mockResolvedValue(1);

    const created = await useCase.execute({
      definition: makeDefinition({ maxConcurrentRuns: 1 }),
      event,
      triggerKind: 'manual',
    });

    expect(pending.create).toHaveBeenCalledWith(
      expect.objectContaining({
        definitionId: 'def-1',
        triggerEventId: 'ev-1',
        kind: 'PENDING_START',
      }),
    );
    expect(runs.create).not.toHaveBeenCalled();
    expect(created).toHaveLength(0);
  });
});
