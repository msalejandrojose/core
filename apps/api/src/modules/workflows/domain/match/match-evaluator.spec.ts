import { evaluateMatch } from './match-evaluator';

describe('evaluateMatch', () => {
  it('matchea expresión vacía o nula siempre', () => {
    expect(evaluateMatch(null, { a: 1 })).toBe(true);
    expect(evaluateMatch({}, { a: 1 })).toBe(true);
  });

  it('azúcar de igualdad con literal', () => {
    expect(evaluateMatch({ userId: 'abc' }, { userId: 'abc' })).toBe(true);
    expect(evaluateMatch({ userId: 'abc' }, { userId: 'xyz' })).toBe(false);
  });

  it('operador eq/neq', () => {
    expect(evaluateMatch({ status: { eq: 'paid' } }, { status: 'paid' })).toBe(
      true,
    );
    expect(evaluateMatch({ status: { neq: 'paid' } }, { status: 'paid' })).toBe(
      false,
    );
  });

  it('comparadores numéricos combinados (AND dentro de la clave)', () => {
    expect(
      evaluateMatch({ amount: { gte: 100, lt: 10000 } }, { amount: 500 }),
    ).toBe(true);
    expect(
      evaluateMatch({ amount: { gte: 100, lt: 10000 } }, { amount: 50 }),
    ).toBe(false);
  });

  it('in / nin', () => {
    expect(
      evaluateMatch(
        { status: { in: ['paid', 'refunded'] } },
        { status: 'paid' },
      ),
    ).toBe(true);
    expect(
      evaluateMatch({ status: { nin: ['paid'] } }, { status: 'paid' }),
    ).toBe(false);
  });

  it('exists', () => {
    expect(evaluateMatch({ coupon: { exists: false } }, { amount: 1 })).toBe(
      true,
    );
    expect(evaluateMatch({ coupon: { exists: true } }, { amount: 1 })).toBe(
      false,
    );
  });

  it('ruta anidada con notación de punto', () => {
    expect(
      evaluateMatch(
        { 'address.country': { eq: 'ES' } },
        { address: { country: 'ES' } },
      ),
    ).toBe(true);
  });

  it('AND implícito entre claves', () => {
    const expr = { country: 'ES', vip: { eq: true } };
    expect(evaluateMatch(expr, { country: 'ES', vip: true })).toBe(true);
    expect(evaluateMatch(expr, { country: 'ES', vip: false })).toBe(false);
  });

  it('$or a nivel raíz', () => {
    const expr = { $or: [{ amount: { gte: 1000 } }, { vip: { eq: true } }] };
    expect(evaluateMatch(expr, { amount: 50, vip: true })).toBe(true);
    expect(evaluateMatch(expr, { amount: 50, vip: false })).toBe(false);
    expect(evaluateMatch(expr, { amount: 5000, vip: false })).toBe(true);
  });
});
