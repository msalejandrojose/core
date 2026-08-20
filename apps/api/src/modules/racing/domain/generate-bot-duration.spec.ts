import { generateBotDuration } from './generate-bot-duration';

describe('generateBotDuration', () => {
  it('sin variación (random=0.5), devuelve exactamente la referencia', () => {
    expect(generateBotDuration(40000, () => 0.5)).toBe(40000);
  });

  it('con random=0, resta el 12% — el bot gana claramente', () => {
    expect(generateBotDuration(40000, () => 0)).toBe(35200);
  });

  it('con random=1, suma el 12% — el bot pierde claramente', () => {
    expect(generateBotDuration(40000, () => 1)).toBe(44800);
  });

  it('nunca devuelve menos de 1ms aunque la referencia sea minúscula', () => {
    expect(generateBotDuration(1, () => 0)).toBeGreaterThanOrEqual(1);
  });

  it('con Math.random real, el resultado varía entre ejecuciones', () => {
    const results = new Set(
      Array.from({ length: 20 }, () => generateBotDuration(40000)),
    );
    expect(results.size).toBeGreaterThan(1);
  });
});
