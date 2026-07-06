import { RetryWorkflowRunUseCase } from './retry-workflow-run.use-case';
import { WorkflowRunNotFoundError } from '../../domain/errors/workflow-run-not-found.error';
import { WorkflowRunNotRetryableError } from '../../domain/errors/workflow-run-not-retryable.error';

describe('RetryWorkflowRunUseCase', () => {
  let runs: { findById: jest.Mock; update: jest.Mock };
  let advance: { execute: jest.Mock };
  let useCase: RetryWorkflowRunUseCase;

  beforeEach(() => {
    runs = {
      findById: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
    };
    advance = { execute: jest.fn().mockResolvedValue(undefined) };
    useCase = new RetryWorkflowRunUseCase(runs as never, advance as never);
  });

  it('run FAILED: lo pone en RUNNING, limpia el error y vuelve a avanzar', async () => {
    runs.findById
      .mockResolvedValueOnce({ id: 'run-1', status: 'FAILED' })
      .mockResolvedValueOnce({ id: 'run-1', status: 'COMPLETED' });

    const result = await useCase.execute('run-1');

    expect(runs.update).toHaveBeenCalledWith('run-1', {
      status: 'RUNNING',
      finishedAt: null,
      lastError: null,
    });
    expect(advance.execute).toHaveBeenCalledWith('run-1');
    // Devuelve el estado fresco tras avanzar.
    expect(result.status).toBe('COMPLETED');
  });

  it('run no FAILED: lanza WorkflowRunNotRetryableError y no avanza', async () => {
    runs.findById.mockResolvedValue({ id: 'run-1', status: 'RUNNING' });

    await expect(useCase.execute('run-1')).rejects.toBeInstanceOf(
      WorkflowRunNotRetryableError,
    );
    expect(runs.update).not.toHaveBeenCalled();
    expect(advance.execute).not.toHaveBeenCalled();
  });

  it('run inexistente: lanza WorkflowRunNotFoundError', async () => {
    runs.findById.mockResolvedValue(null);

    await expect(useCase.execute('nope')).rejects.toBeInstanceOf(
      WorkflowRunNotFoundError,
    );
  });
});
