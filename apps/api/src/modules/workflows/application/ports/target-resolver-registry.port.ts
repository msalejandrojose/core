import { TargetDescriptor, TargetRef } from './target-resolver.port';

export const TARGET_RESOLVER_REGISTRY = Symbol(
  'workflows.TargetResolverRegistry',
);

// Resuelve un descriptor delegando en el resolver registrado para su `type`.
export interface TargetResolverRegistryPort {
  resolve(descriptor: TargetDescriptor): Promise<TargetRef[]>;
  has(type: string): boolean;
  types(): string[];
}
