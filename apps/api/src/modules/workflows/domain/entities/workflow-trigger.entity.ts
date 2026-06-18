export type WorkflowTriggerKind = 'EVENT' | 'CRON' | 'MANUAL';

export interface WorkflowTrigger {
  id: string;
  definitionId: string;
  kind: WorkflowTriggerKind;
  eventType: string | null;
  matchExpression: unknown;
  cronExpression: string | null;
  cronPayload: unknown;
  nextFireAt: Date | null;
}
