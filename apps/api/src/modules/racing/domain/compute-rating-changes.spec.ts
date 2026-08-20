import { computeRatingChanges } from './compute-rating-changes';

describe('computeRatingChanges', () => {
  it('con rating igual, el ganador sube 16 y el perdedor baja 16 (K=32)', () => {
    const result = computeRatingChanges([
      { userId: 'a', position: 1, rating: 1000 },
      { userId: 'b', position: 2, rating: 1000 },
    ]);

    expect(result).toEqual(
      expect.arrayContaining([
        { userId: 'a', ratingBefore: 1000, ratingAfter: 1016, delta: 16 },
        { userId: 'b', ratingBefore: 1000, ratingAfter: 984, delta: -16 },
      ]),
    );
  });

  it('ganar contra un rival de rating mucho más alto da más puntos que contra uno igual', () => {
    const contraIgual = computeRatingChanges([
      { userId: 'a', position: 1, rating: 1000 },
      { userId: 'b', position: 2, rating: 1000 },
    ]);
    const contraSuperior = computeRatingChanges([
      { userId: 'a', position: 1, rating: 1000 },
      { userId: 'b', position: 2, rating: 1400 },
    ]);

    const deltaIgual = contraIgual.find((r) => r.userId === 'a')!.delta;
    const deltaSuperior = contraSuperior.find((r) => r.userId === 'a')!.delta;
    expect(deltaSuperior).toBeGreaterThan(deltaIgual);
  });

  it('con una sola carrera de un jugador (sin rivales), no hay cambio de rating', () => {
    expect(computeRatingChanges([{ userId: 'a', position: 1, rating: 1000 }])).toEqual([]);
  });

  it('el rating no baja del piso de 100', () => {
    // Rating igual (105) → la pérdida bruta sería -16 (máximo posible entre
    // dos), lo que llevaría a b a 89 sin piso — se queda en 100 en su lugar.
    const result = computeRatingChanges([
      { userId: 'a', position: 1, rating: 105 },
      { userId: 'b', position: 2, rating: 105 },
    ]);
    const b = result.find((r) => r.userId === 'b')!;
    expect(b.ratingAfter).toBe(100);
    expect(b.delta).toBe(-5);
  });

  it('carrera de tres: quien queda último pierde puntos contra los dos', () => {
    const result = computeRatingChanges([
      { userId: 'a', position: 1, rating: 1000 },
      { userId: 'b', position: 2, rating: 1000 },
      { userId: 'c', position: 3, rating: 1000 },
    ]);
    const c = result.find((r) => r.userId === 'c')!;
    expect(c.delta).toBeLessThan(0);
    const a = result.find((r) => r.userId === 'a')!;
    expect(a.delta).toBeGreaterThan(0);
  });

  it('la suma de deltas de una carrera de dos es cero (juego de suma cero)', () => {
    const result = computeRatingChanges([
      { userId: 'a', position: 1, rating: 1120 },
      { userId: 'b', position: 2, rating: 980 },
    ]);
    const sum = result.reduce((acc, r) => acc + r.delta, 0);
    expect(sum).toBe(0);
  });
});
