import { PendingAction } from '../../domain/entities/pending-action.entity';
import { PendingActionKind } from '../../domain/entities/pending-action.entity';

export const PENDING_ACTION_REPOSITORY = Symbol(
  'workflows.PendingActionRepository',
);

export interface CreatePendingActionData {
  runId?: string | null;
  definitionId?: string | null;
  triggerEventId?: string | null;
  stepKey?: string | null;
  kind: PendingActionKind;
  runAt?: Date | null;
  eventType?: string | null;
  matchExpression?: unknown;
}

export interface PendingActionRepositoryPort {
  create(data: CreatePendingActionData): Promise<PendingAction>;
  listByRun(runId: string): Promise<PendingAction[]>;
}
