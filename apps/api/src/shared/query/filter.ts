// Predicado simple sobre un campo de `T`. Cada predicado se combina con AND
// implícito al evaluar el filter. Para OR / NOT, futura tarea (`addOr` con
// sub-filter, etc.).
export type Predicate<T> =
  | { readonly op: 'eq'; readonly field: keyof T; readonly value: unknown }
  | { readonly op: 'ne'; readonly field: keyof T; readonly value: unknown }
  | { readonly op: 'in'; readonly field: keyof T; readonly values: ReadonlyArray<unknown> }
  | { readonly op: 'notIn'; readonly field: keyof T; readonly values: ReadonlyArray<unknown> }
  | { readonly op: 'like'; readonly field: keyof T; readonly pattern: string }
  | { readonly op: 'gt'; readonly field: keyof T; readonly value: unknown }
  | { readonly op: 'gte'; readonly field: keyof T; readonly value: unknown }
  | { readonly op: 'lt'; readonly field: keyof T; readonly value: unknown }
  | { readonly op: 'lte'; readonly field: keyof T; readonly value: unknown }
  | { readonly op: 'isNull'; readonly field: keyof T }
  | { readonly op: 'isNotNull'; readonly field: keyof T };

// Filter genérico, builder chainable. Conserva el orden de inserción de los
// predicados (el traductor a Prisma compone los rangos `gt`/`lt` sobre un
// mismo campo).
//
// Type-safe vía `keyof T`: si renombras un campo de la entity, el compilador
// señala todos los sitios.
//
// Ejemplo:
//   const f = new Filter<User>()
//     .addEqualValue('userType', 'BACKOFFICE')
//     .addLike('email', '%@core.dev')
//     .addGreaterOrEqual('createdAt', new Date('2026-01-01'));
export class Filter<T> {
  private readonly _predicates: Predicate<T>[] = [];

  get predicates(): ReadonlyArray<Predicate<T>> {
    return this._predicates;
  }

  isEmpty(): boolean {
    return this._predicates.length === 0;
  }

  addEqualValue<K extends keyof T>(field: K, value: T[K]): this {
    this._predicates.push({ op: 'eq', field, value });
    return this;
  }

  addNotEqualValue<K extends keyof T>(field: K, value: T[K]): this {
    this._predicates.push({ op: 'ne', field, value });
    return this;
  }

  addIn<K extends keyof T>(field: K, values: ReadonlyArray<T[K]>): this {
    this._predicates.push({ op: 'in', field, values: [...values] });
    return this;
  }

  addNotIn<K extends keyof T>(field: K, values: ReadonlyArray<T[K]>): this {
    this._predicates.push({ op: 'notIn', field, values: [...values] });
    return this;
  }

  // Patrón estilo SQL con `%` como wildcard. El traductor se encarga de
  // mapearlo a `contains` / `startsWith` / `endsWith` de Prisma.
  addLike<K extends keyof T>(field: K, pattern: string): this {
    this._predicates.push({ op: 'like', field, pattern });
    return this;
  }

  addGreaterThan<K extends keyof T>(field: K, value: T[K]): this {
    this._predicates.push({ op: 'gt', field, value });
    return this;
  }

  addGreaterOrEqual<K extends keyof T>(field: K, value: T[K]): this {
    this._predicates.push({ op: 'gte', field, value });
    return this;
  }

  addLessThan<K extends keyof T>(field: K, value: T[K]): this {
    this._predicates.push({ op: 'lt', field, value });
    return this;
  }

  addLessOrEqual<K extends keyof T>(field: K, value: T[K]): this {
    this._predicates.push({ op: 'lte', field, value });
    return this;
  }

  addIsNull<K extends keyof T>(field: K): this {
    this._predicates.push({ op: 'isNull', field });
    return this;
  }

  addIsNotNull<K extends keyof T>(field: K): this {
    this._predicates.push({ op: 'isNotNull', field });
    return this;
  }
}
