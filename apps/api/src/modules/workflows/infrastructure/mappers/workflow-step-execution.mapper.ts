import { WorkflowStepExecution as WorkflowStepExecutionRow } from '../../../../generated/prisma/client';
import { WorkflowStepExecution } from '../../domain/entities/workflow-step-execution.entity';

export class WorkflowStepExecutionMapper {
  static toDomain(row: WorkflowStepExecutionRow): WorkflowStepExecution {
    return {
      id: row.id,
      runId: row.runId,
      stepKey: row.stepKey,
      actionKey: row.actionKey,
      status: row.status,
      attempt: row.attempt,
      input: row.input,
      output: row.output,
      error: row.error,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
    };
  }
}
