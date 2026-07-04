import { TargetResolverNotFoundError } from '../../domain/errors/target-resolver-not-found.error';
import {
  TargetDescriptor,
  TargetRef,
  TargetResolver,
} from '../../application/ports/target-resolver.port';
import { TargetResolverRegistryPort } from '../../application/ports/target-resolver-registry.port';

// Registro de resolvers de target, indexado por `type`. Se construye con la
// lista que el `WorkflowsModule` provee (built-in + los que registren otros
// módulos). Detecta colisiones de `type` al arrancar.
export class NestTargetResolverRegistry implements TargetResolverRegistryPort {
  private readonly map = new Map<string, TargetResolver>();

  constructor(resolvers: TargetResolver[]) {
    for (const resolver of resolvers) {
      if (this.map.has(resolver.type)) {
        throw new Error(`Duplicate target resolver type: ${resolver.type}`);
      }
      this.map.set(resolver.type, resolver);
    }
  }

  resolve(descriptor: TargetDescriptor): Promise<TargetRef[]> {
    const resolver = this.map.get(descriptor.type);
    if (!resolver) throw new TargetResolverNotFoundError(descriptor.type);
    return resolver.resolve(descriptor);
  }

  has(type: string): boolean {
    return this.map.has(type);
  }

  types(): string[] {
    return [...this.map.keys()];
  }
}
