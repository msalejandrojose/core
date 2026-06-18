import { ZodType } from 'zod';

// Token de DI con el que cada feature module registra sus handlers de acción.
export const ACTION_HANDLER = Symbol('workflows.ActionHandler');

// Contexto que el motor pasa a cada handler. `dryRun=true` ⇒ el handler NO debe
// producir side-effects (cada módulo es responsable de su dry-run).
export interface ActionContext {
  runId: string;
  definitionKey: string;
  triggerEvent: { type: string; payload: unknown } | null;
  context: Record<string, unknown>;
  dryRun: boolean;
}

// Un handler ejecuta una `action key` del DSL. El `inputSchema` (Zod) valida el
// input ya renderizado justo antes de ejecutar.
export interface ActionHandlerPort<TInput = unknown, TOutput = unknown> {
  readonly key: string;
  readonly inputSchema: ZodType<TInput>;
  readonly outputSchema?: ZodType<TOutput>;
  execute(ctx: ActionContext, input: TInput): Promise<TOutput>;
}
