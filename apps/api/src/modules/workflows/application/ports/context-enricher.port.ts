// Token de DI con el que cada feature module registra sus enrichers de contexto.
export const CONTEXT_ENRICHER = Symbol('workflows.ContextEnricher');

// Datos del disparo que un enricher puede usar para derivar contexto. `event` es
// null sólo en disparos que no nacen de un evento (no ocurre en v1: manual y
// event siempre tienen un WorkflowEvent detrás).
export interface EnrichmentEvent {
  type: string;
  payload: unknown;
  sourceUserId: string | null;
  correlationId: string | null;
  occurredAt: Date;
}

export interface EnrichmentContext {
  definitionKey: string;
  trigger: 'event' | 'manual';
  event: EnrichmentEvent | null;
}

// Una unidad de enriquecimiento del contexto inicial de un run. Recibe el
// contexto acumulado hasta ahora (los enrichers se aplican en cadena, así que
// uno puede leer lo que añadió el anterior) y devuelve un *patch* parcial que se
// fusiona por encima. Debe ser resiliente: si lanza, el registry lo ignora y el
// run arranca igualmente (el enriquecimiento nunca debe tumbar un workflow).
export interface ContextEnricher {
  readonly name: string;
  enrich(
    current: Record<string, unknown>,
    ctx: EnrichmentContext,
  ):
    | Promise<Record<string, unknown> | null | void>
    | Record<string, unknown>
    | null
    | void;
}
