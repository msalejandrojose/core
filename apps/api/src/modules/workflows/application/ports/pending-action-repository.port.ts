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
  deadlineAt?: Date | null;
  eventType?: string | null;
  matchExpression?: unknown;
  target?: unknown;
}

export interface FindDuePendingActionsOptions {
  now: Date;
  kinds: PendingActionKind[];
  limit: number;
}

export interface PendingActionRepositoryPort {
  create(data: CreatePendingActionData): Promise<PendingAction>;
  listByRun(runId: string): Promise<PendingAction[]>;
  // Acciones PENDING (de los `kinds` indicados) con `runAt <= now`, más antigua
  // primero. Para el resumer del scheduler (delay/retry vencidos).
  findDue(opts: FindDuePendingActionsOptions): Promise<PendingAction[]>;
  // Acciones WAIT_EVENT PENDING que esperan un evento de `eventType` (para
  // reanudar por llegada de evento, con match sobre el payload aparte).
  findPendingWaitEvents(eventType: string): Promise<PendingAction[]>;
  // Marca la acción como CONSUMED de forma atómica. Devuelve `true` solo si ESTA
  // llamada la reclamó (estaba PENDING); `false` si ya la consumió otro (idempotencia).
  markConsumed(id: string, consumedEventId?: string | null): Promise<boolean>;
}
