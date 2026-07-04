import { NestContextEnricherRegistry } from './nest-context-enricher.registry';
import {
  ContextEnricher,
  EnrichmentContext,
} from '../../application/ports/context-enricher.port';

const ctx: EnrichmentContext = {
  definitionKey: 'demo',
  trigger: 'event',
  event: {
    type: 'user.signed_up',
    payload: { userId: 'u1' },
    sourceUserId: null,
    correlationId: null,
    occurredAt: new Date('2026-01-01T00:00:00.000Z'),
  },
};

describe('NestContextEnricherRegistry', () => {
  it('parte del base y no lo muta', async () => {
    const base = { a: 1 };
    const registry = new NestContextEnricherRegistry([]);
    const result = await registry.enrich(base, ctx);
    expect(result).toEqual({ a: 1 });
    expect(result).not.toBe(base);
  });

  it('aplica enrichers en cadena; uno posterior ve lo del anterior', async () => {
    const first: ContextEnricher = {
      name: 'first',
      enrich: () => ({ user: { id: 'u1' } }),
    };
    const second: ContextEnricher = {
      name: 'second',
      enrich: (current) => ({
        seenUser: (current.user as { id: string }).id,
      }),
    };
    const registry = new NestContextEnricherRegistry([first, second]);
    const result = await registry.enrich({}, ctx);
    expect(result).toEqual({ user: { id: 'u1' }, seenUser: 'u1' });
  });

  it('un enricher que lanza se ignora y el resto sigue aplicándose', async () => {
    const boom: ContextEnricher = {
      name: 'boom',
      enrich: () => {
        throw new Error('nope');
      },
    };
    const ok: ContextEnricher = {
      name: 'ok',
      enrich: () => ({ ok: true }),
    };
    const registry = new NestContextEnricherRegistry([boom, ok]);
    const result = await registry.enrich({ base: 1 }, ctx);
    expect(result).toEqual({ base: 1, ok: true });
  });

  it('un patch null/void no cambia el acumulado', async () => {
    const noop: ContextEnricher = { name: 'noop', enrich: () => null };
    const registry = new NestContextEnricherRegistry([noop]);
    expect(await registry.enrich({ x: 1 }, ctx)).toEqual({ x: 1 });
  });

  it('names() devuelve los enrichers en orden', () => {
    const a: ContextEnricher = { name: 'a', enrich: () => null };
    const b: ContextEnricher = { name: 'b', enrich: () => null };
    expect(new NestContextEnricherRegistry([a, b]).names()).toEqual(['a', 'b']);
  });
});
