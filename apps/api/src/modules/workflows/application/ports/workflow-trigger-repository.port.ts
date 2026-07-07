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
  target?: unknown;
}

export interface WorkflowTriggerRepositoryPort {
  createMany(triggers: CreateTriggerData[]): Promise<void>;
  // Triggers de tipo EVENT cuya definición está activa, para un eventType dado.
  findActiveEventTriggers(eventType: string): Promise<WorkflowTrigger[]>;
  // Triggers CRON de definiciones activas cuyo `nextFireAt` ya venció (o es
  // NULL = aún no programado). Los consume el scheduler.
  findDueCronTriggers(now: Date): Promise<WorkflowTrigger[]>;
  // Reprograma (reserva) el slot de un trigger CRON de forma ATÓMICA: solo
  // reprograma si su `nextFireAt` sigue siendo `expected` (el valor leído). Así,
  // con varias instancias corriendo el scheduler, solo UNA reclama el slot y
  // dispara — evita el doble disparo. Devuelve `true` si esta llamada lo reclamó.
  claimCronSlot(
    id: string,
    expected: Date | null,
    nextFireAt: Date,
  ): Promise<boolean>;
}
