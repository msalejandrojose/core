import { WorkflowEvent as WorkflowEventRow } from '../../../../generated/prisma/client';
import { WorkflowEvent } from '../../domain/entities/event.entity';

export class WorkflowEventMapper {
  static toDomain(row: WorkflowEventRow): WorkflowEvent {
    return {
      id: row.id,
      type: row.type,
      payload: row.payload,
      sourceUserId: row.sourceUserId,
      correlationId: row.correlationId,
      idempotencyKey: row.idempotencyKey,
      occurredAt: row.occurredAt,
    };
  }
}
