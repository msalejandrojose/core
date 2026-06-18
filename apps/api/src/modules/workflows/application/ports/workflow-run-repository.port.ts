import { PaginatedResult } from '../../../../shared/types/paginated-result';
import {
  WorkflowRun,
  WorkflowRunStatus,
} from '../../domain/entities/workflow-run.entity';

export const WORKFLOW_RUN_REPOSITORY = Symbol(
  'workflows.WorkflowRunRepository',
);

export interface CreateRunData {
  definitionId: string;
  triggerEventId?: string | null;
  context: Record<string, unknown>;
  isDryRun?: boolean;
  currentStepKey?: string | null;
}

export interface UpdateRunData {
  status?: WorkflowRunStatus;
  context?: Record<string, unknown>;
  currentStepKey?: string | null;
  finishedAt?: Date | null;
  lastError?: string | null;
}

export interface ListRunsOptions {
  status?: WorkflowRunStatus;
  definitionId?: string;
  from?: Date;
  page: number;
  limit: number;
}

export interface WorkflowRunRepositoryPort {
  create(data: CreateRunData): Promise<WorkflowRun>;
  findById(id: string): Promise<WorkflowRun | null>;
  update(id: string, patch: UpdateRunData): Promise<WorkflowRun>;
  countActiveByDefinition(definitionId: string): Promise<number>;
  list(opts: ListRunsOptions): Promise<PaginatedResult<WorkflowRun>>;
}
