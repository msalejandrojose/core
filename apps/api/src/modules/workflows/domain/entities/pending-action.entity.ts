export type PendingActionKind =
  | 'DELAY'
  | 'WAIT_EVENT'
  | 'WAIT_CONDITION'
  | 'RETRY'
  | 'PENDING_START';

export type PendingActionStatus = 'PENDING' | 'CONSUMED' | 'CANCELED';

// Trabajo diferido. Se persiste al pausar un run (delay/wait_for_event/
// wait_for_condition/retry); lo consume el resumer del scheduler.
export interface PendingAction {
  id: string;
  runId: string | null;
  definitionId: string | null;
  triggerEventId: string | null;
  stepKey: string | null;
  kind: PendingActionKind;
  status: PendingActionStatus;
  runAt: Date | null;
  // Fecha límite del wait (timeout). Al vencer, el resumer toma la rama onTimeout.
  deadlineAt: Date | null;
  eventType: string | null;
  matchExpression: unknown;
  // Entidad target ya resuelta (fan-out) para PENDING_START. Null = sin target.
  target: unknown;
  consumedEventId: string | null;
  createdAt: Date;
  consumedAt: Date | null;
}
