// Hecho ocurrido en el sistema, inmutable. Entidad de dominio pura.
export interface WorkflowEvent {
  id: string;
  type: string;
  payload: unknown;
  sourceUserId: string | null;
  correlationId: string | null;
  idempotencyKey: string | null;
  occurredAt: Date;
}
