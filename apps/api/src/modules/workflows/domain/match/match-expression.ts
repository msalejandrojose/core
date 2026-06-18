// Tipos del mini-DSL de "match expressions" (spec §4.3). Se evalúa contra un
// objeto plano (típicamente `event.payload` o `run.context`). Puro, sin deps.

export const MATCH_OPERATORS = [
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'nin',
  'exists',
] as const;

export type MatchOperator = (typeof MATCH_OPERATORS)[number];

// Condición sobre una clave: o bien operadores (`{ gte: 100 }`), o un literal
// (azúcar de igualdad: `{ userId: "abc" }`).
export type MatchCondition =
  | Partial<Record<MatchOperator, unknown>>
  | string
  | number
  | boolean
  | null;

// Una expresión es un objeto de claves→condición con AND implícito, más un
// combinador `$or` opcional a nivel raíz.
export interface MatchExpression {
  $or?: MatchExpression[];
  [path: string]: MatchCondition | MatchExpression[] | undefined;
}
