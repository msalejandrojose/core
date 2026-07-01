import { KpiRegistry } from './kpi-registry.service';
import type { KpiDefinition } from './kpi-definition';

function makeDef(slug: string, value = 42): KpiDefinition {
  return {
    slug,
    label: `Label for ${slug}`,
    category: 'test',
    unit: 'count',
    scalar: jest.fn().mockResolvedValue(value),
  };
}

describe('KpiRegistry', () => {
  it('registers and retrieves a KPI by slug', () => {
    const registry = new KpiRegistry();
    const def = makeDef('test.kpi');
    registry.register(def);
    expect(registry.get('test.kpi')).toBe(def);
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
    const first = makeDef('dup');
    const second = makeDef('dup', 99);
    registry.register(first);
    registry.register(second);
    expect(registry.get('dup')).toBe(second);
    expect(registry.getAll()).toHaveLength(1);
  });

  it('scalar() is callable and returns the expected value', async () => {
    const registry = new KpiRegistry();
    registry.register(makeDef('users.total', 123));
    const value = await registry.get('users.total')!.scalar();
    expect(value).toBe(123);
  });
});
