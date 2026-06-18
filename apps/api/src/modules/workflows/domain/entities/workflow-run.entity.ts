export type WorkflowRunStatus =
  | 'RUNNING'
  | 'WAITING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED';

// Instancia viva de un workflow. Todo su estado vive en BBDD.
export interface WorkflowRun {
  id: string;
  definitionId: string;
  triggerEventId: string | null;
  status: WorkflowRunStatus;
  context: Record<string, unknown>;
  currentStepKey: string | null;
  isDryRun: boolean;
  startedAt: Date;
  finishedAt: Date | null;
  lastError: string | null;
  lockedBy: string | null;
  lockedUntil: Date | null;
}
