import { KpiRegistry } from './kpi-registry.service';
import { evaluateExpr } from './kpi-evaluator';
import type { Expr } from './computed-kpi';

function makeRegistry(values: Record<string, number | null>): KpiRegistry {
  const r = new KpiRegistry();
  for (const [slug, v] of Object.entries(values)) {
    r.register({
      slug,
      label: slug,
      category: 'test',
      unit: 'count',
      scalar: v === null ? jest.fn().mockRejectedValue(new Error('fail')) : jest.fn().mockResolvedValue(v),
    });
  }
  return r;
}

describe('evaluateExpr', () => {
  it('const node returns the literal value', async () => {
    const expr: Expr = { kind: 'const', value: 42 };
    expect(await evaluateExpr(expr, new KpiRegistry())).toBe(42);
  });

  it('kpi node resolves via registry', async () => {
    const r = makeRegistry({ 'users.total': 100 });
    expect(await evaluateExpr({ kind: 'kpi', slug: 'users.total' }, r)).toBe(100);
  });

  it('unknown kpi slug returns null', async () => {
    const r = new KpiRegistry();
    expect(await evaluateExpr({ kind: 'kpi', slug: 'no.such.kpi' }, r)).toBeNull();
  });

  it('add two constants', async () => {
    const expr: Expr = { kind: 'op', op: 'add', left: { kind: 'const', value: 3 }, right: { kind: 'const', value: 7 } };
    expect(await evaluateExpr(expr, new KpiRegistry())).toBe(10);
  });

  it('sub', async () => {
    const expr: Expr = { kind: 'op', op: 'sub', left: { kind: 'const', value: 10 }, right: { kind: 'const', value: 4 } };
    expect(await evaluateExpr(expr, new KpiRegistry())).toBe(6);
  });

  it('mul', async () => {
    const expr: Expr = { kind: 'op', op: 'mul', left: { kind: 'const', value: 3 }, right: { kind: 'const', value: 5 } };
    expect(await evaluateExpr(expr, new KpiRegistry())).toBe(15);
  });

  it('div', async () => {
    const expr: Expr = { kind: 'op', op: 'div', left: { kind: 'const', value: 10 }, right: { kind: 'const', value: 4 } };
    expect(await evaluateExpr(expr, new KpiRegistry())).toBe(2.5);
  });

  it('division by zero returns null', async () => {
    const expr: Expr = { kind: 'op', op: 'div', left: { kind: 'const', value: 5 }, right: { kind: 'const', value: 0 } };
    expect(await evaluateExpr(expr, new KpiRegistry())).toBeNull();
  });

  it('null propagates through operations', async () => {
    const r = new KpiRegistry();
    const expr: Expr = {
      kind: 'op', op: 'add',
      left: { kind: 'kpi', slug: 'missing' },
      right: { kind: 'const', value: 10 },
    };
    expect(await evaluateExpr(expr, r)).toBeNull();
  });

  it('deduplicates scalar() calls for the same slug', async () => {
    const scalarFn = jest.fn().mockResolvedValue(50);
    const r = new KpiRegistry();
    r.register({ slug: 'x', label: 'X', category: 'test', unit: 'count', scalar: scalarFn });

    const expr: Expr = {
      kind: 'op', op: 'add',
      left: { kind: 'kpi', slug: 'x' },
      right: { kind: 'kpi', slug: 'x' },
    };
    const result = await evaluateExpr(expr, r);
    expect(result).toBe(100);
    expect(scalarFn).toHaveBeenCalledTimes(1);
  });

  it('computes activation_rate correctly', async () => {
    const r = makeRegistry({ 'users.active': 40, 'users.total': 100 });
    const expr: Expr = { kind: 'op', op: 'div', left: { kind: 'kpi', slug: 'users.active' }, right: { kind: 'kpi', slug: 'users.total' } };
    expect(await evaluateExpr(expr, r)).toBeCloseTo(0.4);
  });
});
