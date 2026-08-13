import { Track } from './entities/track.entity';
import { LapSubmission, validateLap } from './lap-validation';

// Circuito de referencia: 4 sectores y un mínimo físico de 9,2 s, que son los
// valores reales del primer circuito sembrado.
const TRACK = new Track('t1', 'kenney-01', 'Kenney', 4, 9220, true);

const NOW = new Date('2026-08-12T20:00:00.000Z');

function submission(overrides: Partial<LapSubmission> = {}): LapSubmission {
  return {
    durationMs: 42350,
    splitsMs: [10120, 21400, 33900, 42350],
    clientVersion: '0.1.0',
    ...overrides,
  };
}

function validate(
  overrides: Partial<LapSubmission> = {},
  previousAttemptAt: Date | null = null,
) {
  return validateLap(submission(overrides), {
    track: TRACK,
    previousAttemptAt,
    now: NOW,
  });
}

describe('validateLap', () => {
  it('acepta una vuelta normal', () => {
    expect(validate().ok).toBe(true);
  });

  describe('duración', () => {
    it.each([0, -1, 1.5, Number.NaN])('rechaza durationMs = %p', (value) => {
      expect(validate({ durationMs: value }).ok).toBe(false);
    });

    // La barrera física: por debajo, la vuelta no se puede haber corrido por
    // muy bien que se conduzca.
    it('rechaza un tiempo por debajo del mínimo del circuito', () => {
      const result = validate({
        durationMs: 5000,
        splitsMs: [1000, 2000, 3000, 5000],
      });
      expect(result).toMatchObject({ ok: false });
    });

    it('acepta un tiempo justo en el mínimo', () => {
      const min = TRACK.minPlausibleMs;
      expect(validate({ durationMs: min, splitsMs: [1, 2, 3, min] }).ok).toBe(
        true,
      );
    });
  });

  describe('splits', () => {
    it('rechaza un número de sectores distinto al del circuito', () => {
      expect(validate({ splitsMs: [10000, 42350] }).ok).toBe(false);
    });

    it('rechaza splits que retroceden', () => {
      expect(
        validate({ splitsMs: [10120, 9000, 33900, 42350] }).ok,
      ).toBe(false);
    });

    it('rechaza dos splits iguales', () => {
      expect(
        validate({ splitsMs: [10120, 10120, 33900, 42350] }).ok,
      ).toBe(false);
    });

    it('rechaza que el último split no sea la duración', () => {
      expect(
        validate({ splitsMs: [10120, 21400, 33900, 40000] }).ok,
      ).toBe(false);
    });
  });

  describe('ritmo entre intentos', () => {
    // Esto es lo que corta reenviar el mismo tiempo en bucle: la pared no es el
    // número de peticiones, es que el tiempo real no da para tantas vueltas.
    it('rechaza una vuelta que llega antes de que diera tiempo a correrla', () => {
      const hace10s = new Date(NOW.getTime() - 10_000);
      expect(validate({}, hace10s).ok).toBe(false);
    });

    it('acepta cuando ha pasado al menos lo que dura la vuelta', () => {
      const antes = new Date(NOW.getTime() - 42_350);
      expect(validate({}, antes).ok).toBe(true);
    });

    it('acepta el primer intento, que no tiene anterior', () => {
      expect(validate({}, null).ok).toBe(true);
    });
  });

  it('explica el motivo del rechazo', () => {
    const result = validate({ durationMs: 1000, splitsMs: [1, 2, 3, 1000] });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('mínimo físico');
      expect(result.details).toMatchObject({ minPlausibleMs: 9220 });
    }
  });
});
