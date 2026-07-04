// Token de DI con el que cada feature module registra sus resolvers de target.
export const TARGET_RESOLVER = Symbol('workflows.TargetResolver');

// Descriptor declarativo de "sobre qué entidades corre el workflow". `type`
// selecciona el resolver (p.ej. 'users'); `filter` es específico de cada
// resolver (p.ej. `{ isActive: true }`).
export interface TargetDescriptor {
  type: string;
  filter?: Record<string, unknown>;
}

// Una entidad resuelta del sistema. `id` es su identificador; `entityType` el
// tipo lógico ('user', ...); `data` un snapshot que viajará en el contexto del
// run (`context.target.data`) para que las acciones lo usen sin re-consultar.
export interface TargetRef {
  id: string;
  entityType: string;
  data: Record<string, unknown>;
}

// Resuelve un `TargetDescriptor` de un `type` concreto a la lista de entidades
// sobre las que se hará fan-out (un run por entidad).
export interface TargetResolver {
  readonly type: string;
  resolve(descriptor: TargetDescriptor): Promise<TargetRef[]>;
}
