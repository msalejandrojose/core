import { Inject, Injectable } from '@nestjs/common';
import { WorkflowRun } from '../../domain/entities/workflow-run.entity';
import { WorkflowRunNotFoundError } from '../../domain/errors/workflow-run-not-found.error';
import { WorkflowRunNotRetryableError } from '../../domain/errors/workflow-run-not-retryable.error';
import {
  WORKFLOW_RUN_REPOSITORY,
  type WorkflowRunRepositoryPort,
} from '../ports/workflow-run-repository.port';
import { AdvanceWorkflowRunUseCase } from './advance-workflow-run.use-case';

// Reintento MANUAL de un run FALLIDO. Reanuda desde el step que falló
// (currentStepKey no cambió al marcar FAILED): pone el run en RUNNING, limpia el
// último error y vuelve a avanzar. El nº de intento del step se incrementa solo
// (countAttempts en advance), igual que en un reintento automático.
@Injectable()
export class RetryWorkflowRunUseCase {
  constructor(
    @Inject(WORKFLOW_RUN_REPOSITORY)
    private readonly runs: WorkflowRunRepositoryPort,
    private readonly advance: AdvanceWorkflowRunUseCase,
  ) {}

  async execute(id: string): Promise<WorkflowRun> {
    const run = await this.runs.findById(id);
    if (!run) throw new WorkflowRunNotFoundError(id);
    if (run.status !== 'FAILED') {
      throw new WorkflowRunNotRetryableError(id, run.status);
    }

    await this.runs.update(id, {
      status: 'RUNNING',
      finishedAt: null,
      lastError: null,
    });
    await this.advance.execute(id);

    // Estado fresco tras avanzar (RUNNING/WAITING/COMPLETED/FAILED).
    return (await this.runs.findById(id)) ?? run;
  }
}
