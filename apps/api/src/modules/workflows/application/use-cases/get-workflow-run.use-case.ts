import { Inject, Injectable } from '@nestjs/common';
import { PendingAction } from '../../domain/entities/pending-action.entity';
import { WorkflowRun } from '../../domain/entities/workflow-run.entity';
import { WorkflowStepExecution } from '../../domain/entities/workflow-step-execution.entity';
import { WorkflowRunNotFoundError } from '../../domain/errors/workflow-run-not-found.error';
import {
  PENDING_ACTION_REPOSITORY,
  type PendingActionRepositoryPort,
} from '../ports/pending-action-repository.port';
import {
  WORKFLOW_RUN_REPOSITORY,
  type WorkflowRunRepositoryPort,
} from '../ports/workflow-run-repository.port';
import {
  WORKFLOW_STEP_REPOSITORY,
  type WorkflowStepRepositoryPort,
} from '../ports/workflow-step-repository.port';

export interface WorkflowRunDetail {
  run: WorkflowRun;
  steps: WorkflowStepExecution[];
  pendingActions: PendingAction[];
}

@Injectable()
export class GetWorkflowRunUseCase {
  constructor(
    @Inject(WORKFLOW_RUN_REPOSITORY)
    private readonly runs: WorkflowRunRepositoryPort,
    @Inject(WORKFLOW_STEP_REPOSITORY)
    private readonly steps: WorkflowStepRepositoryPort,
    @Inject(PENDING_ACTION_REPOSITORY)
    private readonly pending: PendingActionRepositoryPort,
  ) {}

  async execute(id: string): Promise<WorkflowRunDetail> {
    const run = await this.runs.findById(id);
    if (!run) throw new WorkflowRunNotFoundError(id);
    const [steps, pendingActions] = await Promise.all([
      this.steps.listByRun(id),
      this.pending.listByRun(id),
    ]);
    return { run, steps, pendingActions };
  }
}
