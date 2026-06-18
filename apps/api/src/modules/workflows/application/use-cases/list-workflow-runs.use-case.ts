import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { WorkflowRun } from '../../domain/entities/workflow-run.entity';
import {
  WORKFLOW_RUN_REPOSITORY,
  type ListRunsOptions,
  type WorkflowRunRepositoryPort,
} from '../ports/workflow-run-repository.port';

@Injectable()
export class ListWorkflowRunsUseCase {
  constructor(
    @Inject(WORKFLOW_RUN_REPOSITORY)
    private readonly runs: WorkflowRunRepositoryPort,
  ) {}

  list(opts: ListRunsOptions): Promise<PaginatedResult<WorkflowRun>> {
    return this.runs.list(opts);
  }
}
