import { TriggerContextEnricher } from './trigger-context.enricher';
import { EnrichmentContext } from '../../application/ports/context-enricher.port';

const occurredAt = new Date('2026-01-01T00:00:00.000Z');

type TriggerBlock = { trigger: { actorUserId: string | null } };

function ctx(
  overrides: Partial<EnrichmentContext['event']> = {},
): EnrichmentContext {
  return {
    definitionKey: 'welcome-email',
    trigger: 'event',
    event: {
      type: 'user.signed_up',
      payload: {},
      sourceUserId: null,
      correlationId: null,
      occurredAt,
      ...overrides,
    },
  };
}

describe('TriggerContextEnricher', () => {
  const enricher = new TriggerContextEnricher();

  it('deja un bloque trigger normalizado en el contexto', () => {
    const patch = enricher.enrich({}, ctx({ correlationId: 'corr-1' }));
    expect(patch).toEqual({
      trigger: {
        type: 'user.signed_up',
        kind: 'event',
        correlationId: 'corr-1',
        occurredAt: occurredAt.toISOString(),
        actorUserId: null,
      },
    });
  });

  it('prefiere sourceUserId como actor', () => {
    const patch = enricher.enrich(
      {},
      ctx({ sourceUserId: 'src-1', payload: { userId: 'pay-1' } }),
    );
    expect((patch as TriggerBlock).trigger.actorUserId).toBe('src-1');
  });

  it('cae a payload.userId cuando no hay sourceUserId', () => {
    const patch = enricher.enrich({}, ctx({ payload: { userId: 'pay-1' } }));
    expect((patch as TriggerBlock).trigger.actorUserId).toBe('pay-1');
  });

  it('actorUserId null si no hay identidad en el evento', () => {
    const patch = enricher.enrich({}, ctx({ payload: { foo: 'bar' } }));
    expect((patch as TriggerBlock).trigger.actorUserId).toBeNull();
  });

  it('no aporta nada si no hay evento', () => {
    const patch = enricher.enrich(
      {},
      { definitionKey: 'x', trigger: 'manual', event: null },
    );
    expect(patch).toBeNull();
  });
});
