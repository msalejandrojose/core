import { AdvanceWorkflowRunUseCase } from './advance-workflow-run.use-case';

// Run RUNNING parado en el step `s1` (handler externo `notify`).
const makeRun = () => ({
  id: 'run-1',
  definitionId: 'def-1',
  triggerEventId: null,
  status: 'RUNNING',
  context: {},
  currentStepKey: 's1',
  isDryRun: false,
});

const makeDefinition = (retry?: {
  maxAttempts: number;
  backoff?: 'linear' | 'exponential';
  baseSeconds?: number;
}) => ({
  id: 'def-1',
  key: 'welcome',
  dsl: {
    key: 'welcome',
    name: 'Welcome',
    version: 1,
    triggers: [{ kind: 'manual' }],
    steps: [{ key: 's1', action: 'notify', retry }],
  },
});

describe('AdvanceWorkflowRunUseCase · reintentos', () => {
  let runs: { findById: jest.Mock; update: jest.Mock };
  let definitions: { findById: jest.Mock };
  let steps: {
    start: jest.Mock;
    complete: jest.Mock;
    fail: jest.Mock;
    countAttempts: jest.Mock;
    outputsByRun: jest.Mock;
  };
  let events: { create: jest.Mock; findById: jest.Mock };
  let registry: { resolve: jest.Mock };
  let template: { render: jest.Mock };
  let pending: { create: jest.Mock };
  let engine: { execute: jest.Mock };
  let useCase: AdvanceWorkflowRunUseCase;

  const build = () =>
    new AdvanceWorkflowRunUseCase(
      runs as never,
      definitions as never,
      steps as never,
      events as never,
      registry as never,
      template as never,
      pending as never,
      engine as never,
    );

  beforeEach(() => {
    runs = {
      findById: jest.fn().mockResolvedValue(makeRun()),
      update: jest.fn().mockResolvedValue(undefined),
    };
    definitions = { findById: jest.fn() };
    steps = {
      start: jest.fn().mockResolvedValue({ id: 'exec-1' }),
      complete: jest.fn().mockResolvedValue(undefined),
      fail: jest.fn().mockResolvedValue(undefined),
      countAttempts: jest.fn().mockResolvedValue(0),
      outputsByRun: jest.fn().mockResolvedValue({}),
    };
    events = {
      create: jest.fn().mockResolvedValue({ id: 'ev-1' }),
      findById: jest.fn().mockResolvedValue(null),
    };
    // Handler externo que siempre falla.
    registry = {
      resolve: jest.fn().mockReturnValue({
        inputSchema: { parse: (x: unknown) => x },
        execute: jest.fn().mockRejectedValue(new Error('boom')),
      }),
    };
    template = { render: jest.fn().mockImplementation((x: unknown) => x) };
    pending = { create: jest.fn().mockResolvedValue({ id: 'pa-1' }) };
    engine = { execute: jest.fn() };
    useCase = build();
  });

  it('con reintentos disponibles: programa RETRY y deja el run en WAITING (no FAILED)', async () => {
    definitions.findById.mockResolvedValue(
      makeDefinition({ maxAttempts: 2, baseSeconds: 30 }),
    );
    steps.countAttempts.mockResolvedValue(0); // primer intento

    await useCase.execute('run-1');

    expect(steps.start).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 1 }),
    );
    expect(steps.fail).toHaveBeenCalledWith('exec-1', 'boom');
    expect(pending.create).toHaveBeenCalledWith(
      expect.objectContaining({ runId: 'run-1', stepKey: 's1', kind: 'RETRY' }),
    );
    // El RETRY se programa a futuro (backoff aplicado).
    const createArg = (pending.create.mock.calls[0] as [{ runAt: Date }])[0];
    expect(createArg.runAt).toBeInstanceOf(Date);
    expect(createArg.runAt.getTime()).toBeGreaterThan(Date.now());
    expect(runs.update).toHaveBeenCalledWith('run-1', {
      status: 'WAITING',
      lastError: 'boom',
    });
    // No se marca FAILED ni se emite el evento de fallo mientras haya reintentos.
    expect(runs.update).not.toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ status: 'FAILED' }),
    );
    expect(events.create).not.toHaveBeenCalled();
  });

  it('agotados los intentos: marca FAILED y emite workflow.run_failed', async () => {
    definitions.findById.mockResolvedValue(
      makeDefinition({ maxAttempts: 2, baseSeconds: 30 }),
    );
    steps.countAttempts.mockResolvedValue(1); // ya hubo 1 intento → este es el 2º (último)

    await useCase.execute('run-1');

    expect(steps.start).toHaveBeenCalledWith(
      expect.objectContaining({ attempt: 2 }),
    );
    expect(pending.create).not.toHaveBeenCalled();
    expect(runs.update).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ status: 'FAILED', lastError: 'boom' }),
    );
    expect(events.create).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'workflow.run_failed' }),
    );
  });

  it('sin política de retry: falla directo al primer error', async () => {
    definitions.findById.mockResolvedValue(makeDefinition(undefined));

    await useCase.execute('run-1');

    expect(pending.create).not.toHaveBeenCalled();
    expect(runs.update).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({ status: 'FAILED' }),
    );
  });
});
