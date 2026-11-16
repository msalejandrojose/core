import {
  buildInstructions,
  conversationTitle,
  costUsd,
  effortFor,
  type AiSkill,
} from './agents';

const LUNA = {
  inputPricePerM: 0.1,
  cachedInputPricePerM: 0.01,
  outputPricePerM: 0.5,
};

describe('agentes de IA', () => {
  it('calcula el coste con la parte en caché más barata', () => {
    // 10.000 de entrada (4.000 en caché) y 2.000 de salida en Luna:
    // 6.000×0,10 + 4.000×0,01 + 2.000×0,50 = 600 + 40 + 1.000 = 1.640 / 1e6
    expect(
      costUsd(
        {
          inputTokens: 10_000,
          cachedInputTokens: 4_000,
          outputTokens: 2_000,
          reasoningTokens: 500,
        },
        LUNA,
      ),
    ).toBe(0.00164);
  });

  it('no cuenta más caché que entrada', () => {
    expect(
      costUsd(
        {
          inputTokens: 100,
          cachedInputTokens: 500,
          outputTokens: 0,
          reasoningTokens: 0,
        },
        LUNA,
      ),
    ).toBe(0.000001);
  });

  it('usa el esfuerzo pedido si el modelo lo admite y si no el más bajo', () => {
    expect(effortFor({ efforts: ['none', 'low', 'medium'] }, 'medium')).toBe(
      'medium',
    );
    expect(effortFor({ efforts: ['low', 'medium', 'high'] }, 'none')).toBe(
      'low',
    );
    expect(effortFor({ efforts: [] }, 'low')).toBeNull();
  });

  it('monta las instrucciones con las skills activas y el contexto', () => {
    const skill = (name: string, enabled: boolean): AiSkill => ({
      id: name,
      code: name,
      name,
      description: null,
      instructions: `Haz ${name}.`,
      enabled,
    });
    const text = buildInstructions(
      {
        instructions: 'Eres un coach.',
        skills: [skill('Nutrición', true), skill('Oculta', false)],
      },
      {
        now: new Date('2026-11-16T09:30:00Z'),
        timeZone: 'Europe/Madrid',
        userName: 'Ana',
      },
    );
    expect(text).toContain('Eres un coach.');
    expect(text).toContain('## Nutrición\nHaz Nutrición.');
    expect(text).not.toContain('Oculta');
    expect(text).toContain('10:30');
    expect(text).toContain('Ana');
  });

  it('titula la conversación con el primer mensaje recortado', () => {
    expect(conversationTitle('  ¿Qué  ceno hoy?  ')).toBe('¿Qué ceno hoy?');
    expect(conversationTitle('a'.repeat(80))).toHaveLength(58);
  });
});
