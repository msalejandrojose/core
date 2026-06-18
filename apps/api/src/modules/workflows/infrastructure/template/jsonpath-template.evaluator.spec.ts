import { TemplateScope } from '../../application/ports/template-evaluator.port';
import { JsonPathTemplateEvaluator } from './jsonpath-template.evaluator';

describe('JsonPathTemplateEvaluator', () => {
  const evaluator = new JsonPathTemplateEvaluator();
  const scope: TemplateScope = {
    event: { payload: { userId: 'u1', amount: 500 } },
    context: { channelPreference: 'EMAIL' },
    steps: { send_welcome: { output: { id: 'msg-1' } } },
    now: { iso: '2026-06-18T00:00:00.000Z', ms: 1000 },
    config: { SUPPORT_EMAIL: 'help@core.dev' },
  };

  it('placeholder completo preserva el tipo', () => {
    expect(evaluator.render('{{ event.payload.amount }}', scope)).toBe(500);
    expect(evaluator.render('{{ event.payload.userId }}', scope)).toBe('u1');
  });

  it('placeholder embebido interpola como string', () => {
    expect(evaluator.render('user:{{ event.payload.userId }}', scope)).toBe(
      'user:u1',
    );
  });

  it('renderiza recursivamente objetos y arrays', () => {
    const input = {
      to: '{{ config.SUPPORT_EMAIL }}',
      channels: ['{{ context.channelPreference }}'],
      meta: { ref: '{{ steps.send_welcome.output.id }}' },
    };
    expect(evaluator.render(input, scope)).toEqual({
      to: 'help@core.dev',
      channels: ['EMAIL'],
      meta: { ref: 'msg-1' },
    });
  });

  it('ruta inexistente → undefined (completo) o vacío (embebido)', () => {
    expect(evaluator.render('{{ event.payload.nope }}', scope)).toBeUndefined();
    expect(evaluator.render('x={{ event.payload.nope }}', scope)).toBe('x=');
  });

  it('deja intactos los valores no-string', () => {
    expect(evaluator.render(42, scope)).toBe(42);
    expect(evaluator.render(true, scope)).toBe(true);
  });
});
