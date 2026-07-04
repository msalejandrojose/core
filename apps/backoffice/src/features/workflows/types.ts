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
