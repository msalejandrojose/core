import { WorkflowTrigger } from '../../domain/entities/workflow-trigger.entity';
import { WorkflowTriggerKind } from '../../domain/entities/workflow-trigger.entity';

export const WORKFLOW_TRIGGER_REPOSITORY = Symbol(
  'workflows.WorkflowTriggerRepository',
);

export interface CreateTriggerData {
  definitionId: string;
  kind: WorkflowTriggerKind;
  eventType?: string | null;
  matchExpression?: unknown;
  cronExpression?: string | null;
  cronPayload?: unknown;
  nextFireAt?: Date | null;
}

export interface WorkflowTriggerRepositoryPort {
  createMany(triggers: CreateTriggerData[]): Promise<void>;
  // Triggers de tipo EVENT cuya definición está activa, para un eventType dado.
  findActiveEventTriggers(eventType: string): Promise<WorkflowTrigger[]>;
}
