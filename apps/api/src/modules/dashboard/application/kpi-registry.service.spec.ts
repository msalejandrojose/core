import { ConflictException } from '@nestjs/common';
import { KpiRegistry } from './kpi-registry.service';
import type { KpiDefinition } from './kpi-definition';
import type { ComputedKpiDefinition } from './computed-kpi';

function makeDef(slug: string, value = 42): KpiDefinition {
  return {
    slug,
    label: `Label for ${slug}`,
    category: 'test',
    unit: 'count',
    scalar: jest.fn().mockResolvedValue(value),
  };
}

function makeComputed(slug: string, deps: string[]): ComputedKpiDefinition {
  const [first, ...rest] = deps;
  const expr = rest.reduce(
    (acc, dep) => ({ kind: 'op' as const, op: 'add' as const, left: acc, right: { kind: 'kpi' as const, slug: dep } }),
    { kind: 'kpi' as const, slug: first! },
  );
  return { slug, label: `Computed ${slug}`, category: 'test', unit: 'count', computed: expr };
}

describe('KpiRegistry — scalar KPIs', () => {
  it('registers and retrieves a KPI by slug', () => {
    const registry = new KpiRegistry();
    const def = makeDef('test.kpi');
    registry.register(def);
    expect(registry.get('test.kpi')?.slug).toBe('test.kpi');
  });

  it('returns undefined for unknown slugs', () => {
    const registry = new KpiRegistry();
    expect(registry.get('unknown')).toBeUndefined();
  });

  it('getAll returns all registered KPIs', () => {
    const registry = new KpiRegistry();
    registry.register(makeDef('a'));
    registry.register(makeDef('b'));
    registry.register(makeDef('c'));
    const all = registry.getAll();
    expect(all).toHaveLength(3);
    expect(all.map((d) => d.slug)).toEqual(expect.arrayContaining(['a', 'b', 'c']));
  });

  it('overwriting a slug updates the definition', () => {
    const registry = new KpiRegistry();
    registry.register(makeDef('dup'));
    registry.register(makeDef('dup', 99));
    expect(registry.getAll()).toHaveLength(1);
  });

  it('scalar() returns the expected value', async () => {
    const registry = new KpiRegistry();
    registry.register(makeDef('users.total', 123));
    expect(await registry.get('users.total')!.scalar()).toBe(123);
  });

  it('registered scalar KPIs have kind: scalar', () => {
    const registry = new KpiRegistry();
    registry.register(makeDef('x'));
    expect(registry.get('x')!.kind).toBe('scalar');
  });
});

describe('KpiRegistry — computed KPIs', () => {
  it('registerComputed synthesizes a scalar() from the expression', async () => {
    const registry = new KpiRegistry();
    registry.register(makeDef('a', 10));
    registry.register(makeDef('b', 20));
    registry.registerComputed(makeComputed('c', ['a', 'b']));
    expect(await registry.get('c')!.scalar()).toBe(30);
  });

  it('registered computed KPIs have kind: computed', () => {
    const registry = new KpiRegistry();
    registry.register(makeDef('x', 1));
    registry.registerComputed(makeComputed('y', ['x']));
    expect(registry.get('y')!.kind).toBe('computed');
  });

  it('throws ConflictException on direct self-cycle', () => {
    const registry = new KpiRegistry();
    expect(() => registry.registerComputed(makeComputed('a', ['a']))).toThrow(ConflictException);
  });

  it('throws ConflictException on transitive cycle (A→B→A)', () => {
    const registry = new KpiRegistry();
    registry.register(makeDef('base', 1));
    registry.registerComputed(makeComputed('A', ['base']));
    registry.registerComputed(makeComputed('B', ['A']));
    expect(() => registry.registerComputed(makeComputed('A', ['B']))).toThrow(ConflictException);
  });

  it('does not throw for a valid DAG (A→base, B→A)', () => {
    const registry = new KpiRegistry();
    registry.register(makeDef('base', 5));
    registry.registerComputed(makeComputed('A', ['base']));
    expect(() => registry.registerComputed(makeComputed('B', ['A']))).not.toThrow();
  });
});
