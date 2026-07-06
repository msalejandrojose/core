import { WorkflowStepExecution } from '../../domain/entities/workflow-step-execution.entity';

export const WORKFLOW_STEP_REPOSITORY = Symbol(
  'workflows.WorkflowStepRepository',
);

export interface StartStepData {
  runId: string;
  stepKey: string;
  actionKey: string;
  attempt: number;
  input: unknown;
}

export interface WorkflowStepRepositoryPort {
  start(data: StartStepData): Promise<WorkflowStepExecution>;
  complete(id: string, output: unknown): Promise<void>;
  fail(id: string, error: string): Promise<void>;
  // Nº de ejecuciones registradas de un step dentro de un run (para numerar el
  // siguiente intento: attempt = countAttempts + 1).
  countAttempts(runId: string, stepKey: string): Promise<number>;
  listByRun(runId: string): Promise<WorkflowStepExecution[]>;
  // Mapa { <stepKey>: { output } } de steps SUCCEEDED, para el scope `steps` del template.
  outputsByRun(runId: string): Promise<Record<string, { output: unknown }>>;
}
