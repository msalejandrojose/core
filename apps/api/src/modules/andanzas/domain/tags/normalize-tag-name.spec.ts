import { normalizeTagName } from './normalize-tag-name';

describe('normalizeTagName', () => {
  it('recorta espacios y pasa a minúsculas', () => {
    expect(normalizeTagName('  Playa  ')).toBe('playa');
  });

  it('colapsa espacios múltiples', () => {
    expect(normalizeTagName('vistas   al   mar')).toBe('vistas al mar');
  });

  it('mantiene tildes y ñ', () => {
    expect(normalizeTagName('Montañismo')).toBe('montañismo');
    expect(normalizeTagName('Café')).toBe('café');
  });

  it('variantes que deberían tratarse como el mismo tag normalizan igual', () => {
    const variants = ['Playa', ' playa ', 'PLAYA', 'playa  '];
    const normalized = new Set(variants.map(normalizeTagName));
    expect(normalized.size).toBe(1);
  });
});
