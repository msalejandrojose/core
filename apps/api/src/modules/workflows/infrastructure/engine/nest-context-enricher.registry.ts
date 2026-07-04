import { Logger } from '@nestjs/common';
import {
  ContextEnricher,
  EnrichmentContext,
} from '../../application/ports/context-enricher.port';
import { ContextEnricherRegistryPort } from '../../application/ports/context-enricher-registry.port';

// Registro de enrichers de contexto. Se construye con la lista que el
// `WorkflowsModule` provee (built-in + los que registren otros módulos). Aplica
// los enrichers en cadena sobre el contexto base; cada patch se fusiona por
// encima del acumulado (shallow merge), así que un enricher posterior puede
// leer y sobrescribir lo que puso uno anterior.
export class NestContextEnricherRegistry implements ContextEnricherRegistryPort {
  private readonly logger = new Logger(NestContextEnricherRegistry.name);

  constructor(private readonly enrichers: ContextEnricher[]) {}

  async enrich(
    base: Record<string, unknown>,
    ctx: EnrichmentContext,
  ): Promise<Record<string, unknown>> {
    let acc: Record<string, unknown> = { ...base };
    for (const enricher of this.enrichers) {
      try {
        const patch = await enricher.enrich(acc, ctx);
        if (patch) acc = { ...acc, ...patch };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // Un enricher que falla no debe impedir arrancar el run: se ignora su
        // aporte y se sigue con el resto.
        this.logger.warn(
          `Enricher "${enricher.name}" falló y se ignora: ${message}`,
        );
      }
    }
    return acc;
  }

  names(): string[] {
    return this.enrichers.map((e) => e.name);
  }
}
