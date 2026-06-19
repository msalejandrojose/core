import type { JsonValue } from './json.ts';

/**
 * Condiciones declarativas y serializables para `visibleWhen` / `enabledWhen`.
 *
 * Catálogo cerrado de operadores simples sobre el valor de otro campo, más
 * combinadores `all` / `any` / `not`. El evaluador (`conditions/evaluate.ts`)
 * es una función pura sin efectos.
 */
export type Condition =
  | LeafCondition
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

export type LeafCondition =
  | { field: string; op: 'eq' | 'ne'; value: JsonValue }
  | { field: string; op: 'in' | 'nin'; values: JsonValue[] }
  | { field: string; op: 'truthy' | 'falsy' }
  | { field: string; op: 'gt' | 'gte' | 'lt' | 'lte'; value: number };
