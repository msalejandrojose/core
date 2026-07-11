import { generateInvitationCode } from './generate-invitation-code';

describe('generateInvitationCode', () => {
  it('genera un código de 8 caracteres', () => {
    expect(generateInvitationCode()).toHaveLength(8);
  });

  it('no usa caracteres ambiguos (0/O, 1/I/L)', () => {
    // fuerza que random() recorra todo el rango [0, 1) en pasos finos
    for (let i = 0; i < 200; i++) {
      const code = generateInvitationCode(() => i / 200);
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it('es determinista dada una fuente de aleatoriedad fija', () => {
    const fixedRandom = (() => {
      let i = 0;
      const seq = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
      return () => seq[i++];
    })();
    expect(generateInvitationCode(fixedRandom)).toBe(
      generateInvitationCode((() => {
        let j = 0;
        const seq = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
        return () => seq[j++];
      })()),
    );
  });
});
