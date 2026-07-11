import { canTransition, isScoreConsistentWithStatus } from './status-transition';

describe('canTransition', () => {
  it('crear una entry nueva directamente como WANT_TO_GO está permitido', () => {
    expect(canTransition(null, 'WANT_TO_GO')).toBe(true);
  });

  it('crear una entry nueva directamente como VISITED está permitido (sin pasar por wishlist)', () => {
    expect(canTransition(null, 'VISITED')).toBe(true);
  });

  it('WANT_TO_GO → VISITED está permitido', () => {
    expect(canTransition('WANT_TO_GO', 'VISITED')).toBe(true);
  });

  it('VISITED → WANT_TO_GO no está soportado en el MVP', () => {
    expect(canTransition('VISITED', 'WANT_TO_GO')).toBe(false);
  });

  it('quedarse en el mismo estado no es una transición válida', () => {
    expect(canTransition('WANT_TO_GO', 'WANT_TO_GO')).toBe(false);
    expect(canTransition('VISITED', 'VISITED')).toBe(false);
  });
});

describe('isScoreConsistentWithStatus', () => {
  it('WANT_TO_GO nunca tiene score', () => {
    expect(isScoreConsistentWithStatus('WANT_TO_GO', null)).toBe(true);
    expect(isScoreConsistentWithStatus('WANT_TO_GO', 8)).toBe(false);
  });

  it('VISITED admite score null (visitado sin puntuar todavía)', () => {
    expect(isScoreConsistentWithStatus('VISITED', null)).toBe(true);
  });

  it('VISITED admite tener score', () => {
    expect(isScoreConsistentWithStatus('VISITED', 7.5)).toBe(true);
  });
});
