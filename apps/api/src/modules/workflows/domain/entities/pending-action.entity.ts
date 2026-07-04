export type PendingActionKind =
  | 'DELAY'
  | 'WAIT_EVENT'
  | 'RETRY'
  | 'PENDING_START';

export type PendingActionStatus = 'PENDING' | 'CONSUMED' | 'CANCELED';

// Trabajo diferido. En v1 se persiste al pausar un run (delay/wait_for_event);
// su consumo lo hará el scheduler en una iteración posterior.
export interface PendingAction {
  id: string;
  runId: string | null;
  definitionId: string | null;
  triggerEventId: string | null;
  stepKey: string | null;
  kind: PendingActionKind;
  status: PendingActionStatus;
  runAt: Date | null;
  eventType: string | null;
  matchExpression: unknown;
  // Entidad target ya resuelta (fan-out) para PENDING_START. Null = sin target.
  target: unknown;
  consumedEventId: string | null;
  createdAt: Date;
  consumedAt: Date | null;
}
