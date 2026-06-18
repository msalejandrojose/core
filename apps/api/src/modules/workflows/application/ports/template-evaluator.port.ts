export const TEMPLATE_EVALUATOR = Symbol('workflows.TemplateEvaluator');

// Scopes expuestos a las plantillas del DSL (spec §6.2). NUNCA hay `secrets`.
export interface TemplateScope {
  event: unknown; // triggerEvent.payload (o el evento completo)
  context: unknown; // run.context
  steps: unknown; // { <stepKey>: { output } }
  now: { iso: string; ms: number };
  config: Record<string, string>; // WorkflowsConfig.publicScope()
}

export interface TemplateEvaluatorPort {
  // Renderiza recursivamente cualquier valor sustituyendo `{{ ruta }}`. Si el
  // string es exactamente un placeholder, preserva el tipo del valor resuelto.
  render<T>(value: T, scope: TemplateScope): T;
}
