import { z } from 'zod';

// Schema Zod del DSL de un workflow (spec §4). Se valida al publicar una
// definición; cada input de step se valida aparte contra el `inputSchema` del
// handler en ejecución.

// Match expression: estructura laxa (objeto). La validación semántica la hace
// el `match-evaluator` en runtime.
const matchExpressionSchema = z.record(z.string(), z.unknown());

// Target declarativo: sobre qué entidades del sistema corre el workflow. Si se
// declara, el disparo hace fan-out (un run por entidad resuelta). `type`
// selecciona el resolver registrado (p.ej. 'users').
const targetSchema = z.object({
  type: z.string().min(1).max(120),
  filter: z.record(z.string(), z.unknown()).optional(),
});

const triggerSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('event'),
    eventType: z.string().min(1).max(120),
    match: matchExpressionSchema.optional(),
    target: targetSchema.optional(),
  }),
  z.object({
    kind: z.literal('cron'),
    cronExpression: z.string().min(1).max(60),
    payload: z.record(z.string(), z.unknown()).optional(),
    target: targetSchema.optional(),
  }),
  z.object({
    kind: z.literal('manual'),
    target: targetSchema.optional(),
  }),
]);

const retrySchema = z
  .object({
    maxAttempts: z.number().int().min(1).max(10),
    backoff: z.enum(['linear', 'exponential']).optional(),
    baseSeconds: z.number().int().positive().optional(),
  })
  .optional();

const stepSchema = z.object({
  key: z.string().min(1).max(120),
  action: z.string().min(1).max(120),
  input: z.record(z.string(), z.unknown()).optional(),
  next: z.string().max(120).nullable().optional(),
  onMatch: z.string().max(120).optional(),
  onTimeout: z.string().max(120).optional(),
  retry: retrySchema,
});

export const workflowDslSchema = z
  .object({
    key: z.string().min(1).max(120),
    name: z.string().min(1).max(200),
    version: z.number().int().min(1),
    meta: z
      .object({
        maxConcurrentRuns: z.number().int().positive().optional(),
        description: z.string().optional(),
      })
      .optional(),
    triggers: z.array(triggerSchema).min(1),
    context: z.record(z.string(), z.unknown()).optional(),
    steps: z.array(stepSchema).min(1),
  })
  .superRefine((dsl, ctx) => {
    const keys = new Set<string>();
    for (const step of dsl.steps) {
      if (keys.has(step.key)) {
        ctx.addIssue({
          code: 'custom',
          message: `Step key duplicado: "${step.key}".`,
          path: ['steps'],
        });
      }
      keys.add(step.key);
    }
    // Las transiciones (next/onMatch/onTimeout) deben apuntar a steps existentes.
    const refs: Array<[string | null | undefined, string]> = [];
    for (const step of dsl.steps) {
      refs.push([step.next, `steps.${step.key}.next`]);
      refs.push([step.onMatch, `steps.${step.key}.onMatch`]);
      refs.push([step.onTimeout, `steps.${step.key}.onTimeout`]);
    }
    for (const [ref, path] of refs) {
      if (ref != null && !keys.has(ref)) {
        ctx.addIssue({
          code: 'custom',
          message: `Transición "${path}" apunta a un step inexistente: "${ref}".`,
          path: path.split('.'),
        });
      }
    }
  });

export type WorkflowDsl = z.infer<typeof workflowDslSchema>;
export type StepDefinition = z.infer<typeof stepSchema>;
export type TriggerDefinition = z.infer<typeof triggerSchema>;
// Política de reintentos de un step, ya sin el `undefined` del `.optional()`.
export type RetryPolicy = NonNullable<z.infer<typeof retrySchema>>;

// Acciones implementadas por el propio motor (no necesitan handler externo).
export const ENGINE_ACTIONS = [
  'delay',
  'wait_for_event',
  'wait_for_condition',
  'branch',
  'context.set',
  'event.emit',
  'workflow.start',
] as const;

export type EngineAction = (typeof ENGINE_ACTIONS)[number];

export function isEngineAction(action: string): action is EngineAction {
  return (ENGINE_ACTIONS as readonly string[]).includes(action);
}

/** Resuelve el siguiente step tras `step` (campo `next` o el siguiente del array). */
export function resolveNextStepKey(
  dsl: WorkflowDsl,
  stepKey: string,
): string | null {
  const idx = dsl.steps.findIndex((s) => s.key === stepKey);
  if (idx === -1) return null;
  const step = dsl.steps[idx];
  if (step.next !== undefined) return step.next; // puede ser null = fin
  const nextStep = dsl.steps[idx + 1];
  return nextStep ? nextStep.key : null;
}

export function findStep(
  dsl: WorkflowDsl,
  stepKey: string | null,
): StepDefinition | null {
  if (stepKey === null) return dsl.steps[0] ?? null;
  return dsl.steps.find((s) => s.key === stepKey) ?? null;
}
