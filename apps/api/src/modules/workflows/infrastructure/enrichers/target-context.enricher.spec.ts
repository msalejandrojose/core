import { TargetContextEnricher } from './target-context.enricher';
import { EnrichmentContext } from '../../application/ports/context-enricher.port';

const base: Omit<EnrichmentContext, 'target'> = {
  definitionKey: 'welcome',
  trigger: 'cron',
  event: null,
};

describe('TargetContextEnricher', () => {
  const enricher = new TargetContextEnricher();

  it('expone la entidad target en context.target', () => {
    const patch = enricher.enrich(
      {},
      {
        ...base,
        target: { id: 'u1', entityType: 'user', data: { email: 'a@x.com' } },
      },
    );
    expect(patch).toEqual({
      target: {
        id: 'u1',
        entityType: 'user',
        data: { email: 'a@x.com' },
      },
    });
  });

  it('no aporta nada si el run no tiene target', () => {
    expect(enricher.enrich({}, { ...base, target: null })).toBeNull();
    expect(enricher.enrich({}, base)).toBeNull();
  });
});
