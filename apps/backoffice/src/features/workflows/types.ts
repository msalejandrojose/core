/**
 * Tipos del módulo de workflows del backoffice.
 *
 * Reflejan los DTOs que expone el módulo `workflows` de la API
 * (`apps/api/src/modules/workflows`) y la forma JSON del DSL (spec §4) que se
 * valida en el backend con Zod. Se mantienen locales a la feature siguiendo la
 * convención de `dynamic-forms`; si en el futuro se comparten con la web o el
 * editor de edición conviene promoverlos a `@core/shared-types`.
 */

/** Envoltura de paginación offset devuelta por la API (`PaginatedResponseDto`). */
export interface OffsetPage<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// --- DSL (forma JSON del workflow) --------------------------------------

export type WorkflowTriggerKind = 'event' | 'cron' | 'manual';

export interface WorkflowTriggerJson {
  kind: WorkflowTriggerKind;
  /** kind = event */
  eventType?: string;
  match?: Record<string, unknown>;
  /** kind = cron */
  cronExpression?: string;
  payload?: Record<string, unknown>;
}

export interface WorkflowStepRetryJson {
  maxAttempts: number;
  backoff?: 'linear' | 'exponential';
  baseSeconds?: number;
}

export interface WorkflowStepJson {
  key: string;
  action: string;
  input?: Record<string, unknown>;
  /** `null` = fin del workflow; `undefined` = pasar al siguiente del array. */
  next?: string | null;
  /** Transición cuando llega el evento esperado (steps `wait_for_event`). */
  onMatch?: string;
  /** Transición cuando expira la espera. */
  onTimeout?: string;
  retry?: WorkflowStepRetryJson;
}

export interface WorkflowDslJson {
  key: string;
  name: string;
  version: number;
  meta?: { maxConcurrentRuns?: number; description?: string };
  triggers: WorkflowTriggerJson[];
  context?: Record<string, unknown>;
  steps: WorkflowStepJson[];
}

// --- DTOs ---------------------------------------------------------------

export interface WorkflowDefinitionDto {
  id: string;
  key: string;
  version: number;
  name: string;
  description: string | null;
  isActive: boolean;
  dsl: WorkflowDslJson;
  createdAt: string;
  publishedAt: string | null;
}

/** Fila del listado de definiciones. */
export type WorkflowDefinitionRow = Pick<
  WorkflowDefinitionDto,
  'key' | 'name' | 'version' | 'isActive' | 'createdAt'
> & {
  triggerCount: number;
  stepCount: number;
};

// --- Catálogo de acciones ----------------------------------------------

/**
 * Acciones implementadas por el propio motor (no necesitan handler externo).
 * Espejo de `ENGINE_ACTIONS` en `workflow-dsl.ts` del backend.
 */
export const ENGINE_ACTIONS = [
  'delay',
  'wait_for_event',
  'branch',
  'context.set',
  'event.emit',
  'workflow.start',
] as const;

export function isEngineAction(action: string): boolean {
  return (ENGINE_ACTIONS as readonly string[]).includes(action);
}

export const TRIGGER_KIND_LABELS: Record<WorkflowTriggerKind, string> = {
  event: 'Evento',
  cron: 'Programado (cron)',
  manual: 'Manual',
};

/** Entrada del catálogo de handlers (`GET /workflows/handlers`). */
export interface RegisteredHandlerInfo {
  key: string;
  /** JSON Schema aproximado del input, para el editor. */
  inputSchema: unknown;
}

// --- Runs / ejecución ---------------------------------------------------

export type WorkflowRunStatus =
  | 'RUNNING'
  | 'WAITING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED';

export type WorkflowStepStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'SKIPPED';

export interface WorkflowRunDto {
  id: string;
  definitionId: string;
  triggerEventId: string | null;
  status: WorkflowRunStatus;
  context: Record<string, unknown>;
  currentStepKey: string | null;
  isDryRun: boolean;
  startedAt: string;
  finishedAt: string | null;
  lastError: string | null;
}

export interface WorkflowStepExecutionDto {
  id: string;
  stepKey: string;
  actionKey: string;
  status: WorkflowStepStatus;
  attempt: number;
  input: unknown;
  output: unknown;
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
}

export interface PendingActionDto {
  id: string;
  stepKey: string | null;
  kind: string;
  status: string;
  runAt: string | null;
  eventType: string | null;
  createdAt: string;
}

export interface WorkflowRunDetailDto {
  run: WorkflowRunDto;
  steps: WorkflowStepExecutionDto[];
  pendingActions: PendingActionDto[];
}

export const RUN_STATUSES: WorkflowRunStatus[] = [
  'RUNNING',
  'WAITING',
  'COMPLETED',
  'FAILED',
  'CANCELED',
];

export const RUN_STATUS_LABELS: Record<WorkflowRunStatus, string> = {
  RUNNING: 'En curso',
  WAITING: 'En espera',
  COMPLETED: 'Completado',
  FAILED: 'Fallido',
  CANCELED: 'Cancelado',
};

/** Variante del `Badge` por estado de run. */
export const RUN_STATUS_VARIANT: Record<
  WorkflowRunStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  RUNNING: 'default',
  WAITING: 'outline',
  COMPLETED: 'secondary',
  FAILED: 'destructive',
  CANCELED: 'secondary',
};

export const STEP_STATUS_LABELS: Record<WorkflowStepStatus, string> = {
  PENDING: 'Pendiente',
  RUNNING: 'En curso',
  SUCCEEDED: 'OK',
  FAILED: 'Fallido',
  SKIPPED: 'Omitido',
};

export const STEP_STATUS_VARIANT: Record<
  WorkflowStepStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  PENDING: 'outline',
  RUNNING: 'default',
  SUCCEEDED: 'secondary',
  FAILED: 'destructive',
  SKIPPED: 'outline',
};

export function isRunActive(status: WorkflowRunStatus): boolean {
  return status === 'RUNNING' || status === 'WAITING';
}

// --- Eventos ------------------------------------------------------------

export interface WorkflowEventDto {
  id: string;
  type: string;
  payload: unknown;
  sourceUserId: string | null;
  correlationId: string | null;
  idempotencyKey: string | null;
  occurredAt: string;
}
