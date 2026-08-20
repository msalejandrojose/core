import { matchmakingRatingWindow } from './matchmaking-rating-window';

describe('matchmakingRatingWindow', () => {
  it('empieza estrecha para una sala recién creada', () => {
    expect(matchmakingRatingWindow(0)).toBe(100);
  });

  it('crece con el tiempo de espera', () => {
    expect(matchmakingRatingWindow(1000)).toBe(150);
    expect(matchmakingRatingWindow(15000)).toBe(850);
  });

  it('no se estrecha con un tiempo de espera negativo', () => {
    expect(matchmakingRatingWindow(-500)).toBe(100);
  });

  it('sigue creciendo sin techo cuanto más se espera', () => {
    expect(matchmakingRatingWindow(120_000)).toBeGreaterThan(matchmakingRatingWindow(15_000));
  });
});
