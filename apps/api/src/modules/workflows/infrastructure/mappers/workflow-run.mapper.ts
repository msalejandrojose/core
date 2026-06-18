import { WorkflowRun as WorkflowRunRow } from '../../../../generated/prisma/client';
import { WorkflowRun } from '../../domain/entities/workflow-run.entity';

export class WorkflowRunMapper {
  static toDomain(row: WorkflowRunRow): WorkflowRun {
    return {
      id: row.id,
      definitionId: row.definitionId,
      triggerEventId: row.triggerEventId,
      status: row.status,
      context: (row.context ?? {}) as Record<string, unknown>,
      currentStepKey: row.currentStepKey,
      isDryRun: row.isDryRun,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      lastError: row.lastError,
      lockedBy: row.lockedBy,
      lockedUntil: row.lockedUntil,
    };
  }
}
