import { isValidDuration, parseDurationSeconds } from './duration.vo';

describe('parseDurationSeconds', () => {
  it('parsea unidades', () => {
    expect(parseDurationSeconds('45s')).toBe(45);
    expect(parseDurationSeconds('30m')).toBe(1800);
    expect(parseDurationSeconds('2h')).toBe(7200);
    expect(parseDurationSeconds('1d')).toBe(86400);
    expect(parseDurationSeconds('1w')).toBe(604800);
  });

  it('acepta segundos numéricos', () => {
    expect(parseDurationSeconds(120)).toBe(120);
  });

  it('lanza con formato inválido', () => {
    expect(() => parseDurationSeconds('10x')).toThrow();
    expect(() => parseDurationSeconds(-5)).toThrow();
  });

  it('isValidDuration', () => {
    expect(isValidDuration('1d')).toBe(true);
    expect(isValidDuration('nope')).toBe(false);
  });
});
