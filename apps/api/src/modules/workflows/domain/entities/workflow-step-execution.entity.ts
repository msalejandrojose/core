export type WorkflowStepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'SKIPPED';

// Registro auditado de la ejecución de un step dentro de un run.
export interface WorkflowStepExecution {
  id: string;
  runId: string;
  stepKey: string;
  actionKey: string;
  status: WorkflowStepStatus;
  attempt: number;
  input: unknown;
  output: unknown;
  error: string | null;
  startedAt: Date;
  finishedAt: Date | null;
}
