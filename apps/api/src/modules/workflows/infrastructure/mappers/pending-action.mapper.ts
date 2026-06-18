import { PendingAction as PendingActionRow } from '../../../../generated/prisma/client';
import { PendingAction } from '../../domain/entities/pending-action.entity';

export class PendingActionMapper {
  static toDomain(row: PendingActionRow): PendingAction {
    return {
      id: row.id,
      runId: row.runId,
      definitionId: row.definitionId,
      triggerEventId: row.triggerEventId,
      stepKey: row.stepKey,
      kind: row.kind,
      status: row.status,
      runAt: row.runAt,
      eventType: row.eventType,
      matchExpression: row.matchExpression,
      consumedEventId: row.consumedEventId,
      createdAt: row.createdAt,
      consumedAt: row.consumedAt,
    };
  }
}
