import { describe, expect, it } from 'vitest';
import { formatKpiValue } from './format-kpi';

describe('formatKpiValue', () => {
  it('formatea count con separadores de miles', () => {
    expect(formatKpiValue(1234567, 'count')).toBe('1.234.567');
  });

  it('formatea count por defecto (sin unidad)', () => {
    expect(formatKpiValue(42)).toBe('42');
  });

  it('formatea percent desde una fracción 0..1', () => {
    expect(formatKpiValue(0.1234, 'percent')).toBe('12.3%');
  });

  it('formatea bytes en tamaño humano', () => {
    expect(formatKpiValue(0, 'bytes')).toBe('0 B');
    expect(formatKpiValue(1024, 'bytes')).toBe('1 KB');
    expect(formatKpiValue(1536, 'bytes')).toBe('1.5 KB');
    expect(formatKpiValue(5 * 1024 * 1024, 'bytes')).toBe('5 MB');
  });

  it('muestra guion para valores nulos o NaN', () => {
    expect(formatKpiValue(null)).toBe('—');
    expect(formatKpiValue(undefined)).toBe('—');
    expect(formatKpiValue(Number.NaN, 'count')).toBe('—');
  });
});
