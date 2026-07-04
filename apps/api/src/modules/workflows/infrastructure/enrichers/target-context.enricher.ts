import { Injectable } from '@nestjs/common';
import {
  ContextEnricher,
  EnrichmentContext,
} from '../../application/ports/context-enricher.port';

// Enricher built-in que deja en el contexto la entidad sobre la que corre este
// run (fan-out). Así una acción puede referenciar `{{ context.target.id }}` o
// `{{ context.target.data.email }}` — p.ej. el usuario al que mandarle el
// correo en un workflow que corre "sobre todos los users".
@Injectable()
export class TargetContextEnricher implements ContextEnricher {
  readonly name = 'target-context';

  enrich(
    _current: Record<string, unknown>,
    ctx: EnrichmentContext,
  ): Record<string, unknown> | null {
    if (!ctx.target) return null;

    return {
      target: {
        id: ctx.target.id,
        entityType: ctx.target.entityType,
        data: ctx.target.data,
      },
    };
  }
}
