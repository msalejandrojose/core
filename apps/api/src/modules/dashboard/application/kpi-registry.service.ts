import { ConflictException, Injectable } from '@nestjs/common';
import { exprDeps, type ComputedKpiDefinition } from './computed-kpi';
import { evaluateExpr } from './kpi-evaluator';
import type { KpiDefinition } from './kpi-definition';

@Injectable()
export class KpiRegistry {
  private readonly defs = new Map<string, KpiDefinition>();
  /** Adjacency list: slug → slugs it depends on (for cycle detection). */
  private readonly deps = new Map<string, string[]>();

  register(def: KpiDefinition): void {
    this.defs.set(def.slug, { kind: 'scalar', ...def });
    this.deps.set(def.slug, []);
  }

  registerComputed(def: ComputedKpiDefinition): void {
    const directDeps = exprDeps(def.computed);

    if (this.hasCycle(def.slug, directDeps)) {
      throw new ConflictException(
        `Computed KPI '${def.slug}' introduces a dependency cycle`,
      );
    }

    const registry = this;
    this.defs.set(def.slug, {
      slug: def.slug,
      label: def.label,
      description: def.description,
      category: def.category,
      unit: def.unit,
      format: def.format,
      kind: 'computed',
      scalar: () => evaluateExpr(def.computed, registry),
    });
    this.deps.set(def.slug, directDeps);
  }

  get(slug: string): KpiDefinition | undefined {
    return this.defs.get(slug);
  }

  getAll(): KpiDefinition[] {
    return [...this.defs.values()];
  }

  /** DFS to check if registering `slug` with `directDeps` would create a cycle. */
  private hasCycle(slug: string, directDeps: string[]): boolean {
    const visited = new Set<string>();

    const dfs = (current: string): boolean => {
      if (current === slug) return true;
      if (visited.has(current)) return false;
      visited.add(current);
      const neighbors = this.deps.get(current) ?? [];
      return neighbors.some((n) => dfs(n));
    };

    return directDeps.some((dep) => dfs(dep));
  }
}
