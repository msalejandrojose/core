import { EnrichmentContext } from './context-enricher.port';

export const CONTEXT_ENRICHER_REGISTRY = Symbol(
  'workflows.ContextEnricherRegistry',
);

// Compone todos los enrichers registrados: parte de `base` (normalmente el
// `context` inicial del DSL) y aplica cada enricher en orden, fusionando su
// patch. Es lo que el motor invoca al crear un run para dejar el contexto listo
// antes de avanzar el primer step.
export interface ContextEnricherRegistryPort {
  enrich(
    base: Record<string, unknown>,
    ctx: EnrichmentContext,
  ): Promise<Record<string, unknown>>;

  // Nombres de los enrichers registrados, en orden de aplicación (observabilidad).
  names(): string[];
}
