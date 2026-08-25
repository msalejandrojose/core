import { resolveLiveRaceResult } from './resolve-live-race-result';

describe('resolveLiveRaceResult', () => {
  it('ordena a los que terminaron por tiempo ascendente', () => {
    const result = resolveLiveRaceResult(
      [
        { userId: 'b', durationMs: 42000 },
        { userId: 'a', durationMs: 40000 },
        { userId: 'c', durationMs: 45000 },
      ],
      [],
    );

    expect(result.map((p) => p.userId)).toEqual(['a', 'b', 'c']);
    expect(result.map((p) => p.position)).toEqual([1, 2, 3]);
  });

  it('calcula el delta contra el ganador', () => {
    const result = resolveLiveRaceResult(
      [
        { userId: 'a', durationMs: 40000 },
        { userId: 'b', durationMs: 42500 },
      ],
      [],
    );

    expect(result.find((p) => p.userId === 'a')?.deltaMs).toBe(0);
    expect(result.find((p) => p.userId === 'b')?.deltaMs).toBe(2500);
  });

  it('añade a los DNF detrás de los que terminaron, sin tiempo ni delta', () => {
    const result = resolveLiveRaceResult(
      [{ userId: 'a', durationMs: 40000 }],
      ['b'],
    );

    const dnf = result.find((p) => p.userId === 'b');
    expect(dnf).toMatchObject({
      durationMs: null,
      deltaMs: null,
      disconnected: true,
      position: 2,
    });
  });

  it('no marca disconnected a quien sí terminó', () => {
    const result = resolveLiveRaceResult(
      [{ userId: 'a', durationMs: 40000 }],
      [],
    );

    expect(result[0].disconnected).toBe(false);
  });

  it('funciona con varios DNF y ningún finisher (sala abandonada)', () => {
    const result = resolveLiveRaceResult([], ['a', 'b']);

    expect(result).toEqual([
      { userId: 'a', durationMs: null, position: 1, deltaMs: null, disconnected: true },
      { userId: 'b', durationMs: null, position: 2, deltaMs: null, disconnected: true },
    ]);
  });

  it('el ganador tiene siempre deltaMs 0', () => {
    const result = resolveLiveRaceResult(
      [{ userId: 'solo', durationMs: 55000 }],
      [],
    );

    expect(result[0]).toMatchObject({ position: 1, deltaMs: 0 });
  });
});
