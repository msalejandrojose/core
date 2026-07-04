import { Injectable } from '@nestjs/common';
import {
  ContextEnricher,
  EnrichmentContext,
} from '../../application/ports/context-enricher.port';

// Enricher built-in. De momento hace lo mínimo: deja en el contexto un bloque
// `trigger` normalizado con la identidad del disparo, de modo que cualquier step
// o enricher posterior tenga un sitio estable de donde leer (p.ej.
// `{{ context.trigger.actorUserId }}` para mandarle un correo al usuario que
// disparó el evento). A futuro, enrichers de dominio (IAM, etc.) resolverán el
// usuario/entidades completas a partir de este `actorUserId`.
@Injectable()
export class TriggerContextEnricher implements ContextEnricher {
  readonly name = 'trigger-context';

  enrich(
    _current: Record<string, unknown>,
    ctx: EnrichmentContext,
  ): Record<string, unknown> | null {
    if (!ctx.event) return null;

    return {
      trigger: {
        type: ctx.event.type,
        kind: ctx.trigger,
        correlationId: ctx.event.correlationId,
        occurredAt: ctx.event.occurredAt.toISOString(),
        actorUserId: resolveActorUserId(ctx.event),
      },
    };
  }
}

// El actor es, por orden de preferencia: el `sourceUserId` de primera clase del
// evento y, si no, un `userId` string presente en el payload (convención habitual
// en eventos como `user.signed_up`). Null si no hay ninguno.
function resolveActorUserId(event: EnrichmentContext['event']): string | null {
  if (!event) return null;
  if (event.sourceUserId) return event.sourceUserId;

  const payload = event.payload;
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const userId = (payload as Record<string, unknown>).userId;
    if (typeof userId === 'string' && userId.length > 0) return userId;
  }
  return null;
}
