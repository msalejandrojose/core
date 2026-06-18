import { WorkflowTrigger as WorkflowTriggerRow } from '../../../../generated/prisma/client';
import { WorkflowTrigger } from '../../domain/entities/workflow-trigger.entity';

export class WorkflowTriggerMapper {
  static toDomain(row: WorkflowTriggerRow): WorkflowTrigger {
    return {
      id: row.id,
      definitionId: row.definitionId,
      kind: row.kind,
      eventType: row.eventType,
      matchExpression: row.matchExpression,
      cronExpression: row.cronExpression,
      cronPayload: row.cronPayload,
      nextFireAt: row.nextFireAt,
    };
  }
}
