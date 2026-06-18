import {
  isEngineAction,
  resolveNextStepKey,
  workflowDslSchema,
} from './workflow-dsl';

const validDsl = {
  key: 'welcome',
  name: 'Onboarding',
  version: 1,
  triggers: [{ kind: 'event', eventType: 'user.signed_up' }],
  steps: [
    { key: 'a', action: 'log', input: { msg: 'hi' } },
    { key: 'b', action: 'context.set', input: { done: true }, next: null },
  ],
};

describe('workflowDslSchema', () => {
  it('acepta un DSL válido', () => {
    expect(workflowDslSchema.safeParse(validDsl).success).toBe(true);
  });

  it('rechaza DSL sin triggers', () => {
    const r = workflowDslSchema.safeParse({ ...validDsl, triggers: [] });
    expect(r.success).toBe(false);
  });

  it('rechaza step keys duplicadas', () => {
    const r = workflowDslSchema.safeParse({
      ...validDsl,
      steps: [
        { key: 'a', action: 'log' },
        { key: 'a', action: 'log' },
      ],
    });
    expect(r.success).toBe(false);
  });

  it('rechaza transición a un step inexistente', () => {
    const r = workflowDslSchema.safeParse({
      ...validDsl,
      steps: [{ key: 'a', action: 'log', next: 'ghost' }],
    });
    expect(r.success).toBe(false);
  });
});

describe('resolveNextStepKey', () => {
  const dsl = workflowDslSchema.parse(validDsl);

  it('usa el siguiente del array si no hay next explícito', () => {
    expect(resolveNextStepKey(dsl, 'a')).toBe('b');
  });

  it('next: null termina el run', () => {
    expect(resolveNextStepKey(dsl, 'b')).toBeNull();
  });
});

describe('isEngineAction', () => {
  it('reconoce acciones del motor y descarta las externas', () => {
    expect(isEngineAction('context.set')).toBe(true);
    expect(isEngineAction('delay')).toBe(true);
    expect(isEngineAction('notification.send')).toBe(false);
  });
});
