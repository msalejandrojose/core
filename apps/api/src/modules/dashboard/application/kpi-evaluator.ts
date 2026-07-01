import type { Expr } from './computed-kpi';
import type { KpiRegistry } from './kpi-registry.service';

/**
 * Evaluates an Expr AST against the registry.
 *
 * - Returns null on division by zero or missing KPI slugs.
 * - Deduplicates scalar() calls: each slug is evaluated at most once per call,
 *   using a shared cache passed through the recursive evaluation.
 */
export async function evaluateExpr(
  expr: Expr,
  registry: KpiRegistry,
  cache: Map<string, Promise<number | null>> = new Map(),
): Promise<number | null> {
  switch (expr.kind) {
    case 'const':
      return expr.value;

    case 'kpi': {
      if (!cache.has(expr.slug)) {
        const def = registry.get(expr.slug);
        if (!def) {
          cache.set(expr.slug, Promise.resolve(null));
        } else {
          cache.set(
            expr.slug,
            def.scalar().catch(() => null),
          );
        }
      }
      return cache.get(expr.slug)!;
    }

    case 'op': {
      const [left, right] = await Promise.all([
        evaluateExpr(expr.left, registry, cache),
        evaluateExpr(expr.right, registry, cache),
      ]);
      if (left === null || right === null) return null;
      switch (expr.op) {
        case 'add':
          return left + right;
        case 'sub':
          return left - right;
        case 'mul':
          return left * right;
        case 'div':
          return right === 0 ? null : left / right;
      }
    }
  }
}
