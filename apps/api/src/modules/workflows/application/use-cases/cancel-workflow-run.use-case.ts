import { Inject, Injectable } from '@nestjs/common';
import { WorkflowRun } from '../../domain/entities/workflow-run.entity';
import { WorkflowRunNotFoundError } from '../../domain/errors/workflow-run-not-found.error';
import {
  WORKFLOW_RUN_REPOSITORY,
  type WorkflowRunRepositoryPort,
} from '../ports/workflow-run-repository.port';

@Injectable()
export class CancelWorkflowRunUseCase {
  constructor(
    @Inject(WORKFLOW_RUN_REPOSITORY)
    private readonly runs: WorkflowRunRepositoryPort,
  ) {}

  // Cancela un run en curso (RUNNING/WAITING). Idempotente sobre estados finales.
  async execute(id: string): Promise<WorkflowRun> {
    const run = await this.runs.findById(id);
    if (!run) throw new WorkflowRunNotFoundError(id);
    if (run.status === 'RUNNING' || run.status === 'WAITING') {
      return this.runs.update(id, {
        status: 'CANCELED',
        finishedAt: new Date(),
      });
    }
    return run;
  }
}
