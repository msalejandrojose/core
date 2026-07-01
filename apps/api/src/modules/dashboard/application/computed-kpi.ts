export type Expr =
  | { kind: 'kpi'; slug: string }
  | { kind: 'const'; value: number }
  | { kind: 'op'; op: 'add' | 'sub' | 'mul' | 'div'; left: Expr; right: Expr };

export interface ComputedKpiDefinition {
  slug: string;
  label: string;
  description?: string;
  category: string;
  unit: 'count' | 'bytes' | 'percent' | 'currency' | 'duration_ms';
  format?: 'integer' | 'decimal' | 'compact';
  computed: Expr;
}

/** Returns all slugs that an expression directly depends on. */
export function exprDeps(expr: Expr): string[] {
  switch (expr.kind) {
    case 'kpi':
      return [expr.slug];
    case 'const':
      return [];
    case 'op':
      return [...exprDeps(expr.left), ...exprDeps(expr.right)];
  }
}
