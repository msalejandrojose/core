import {
  circuitRotationNeedsRotation,
  selectCircuitsForRotation,
} from './racing-circuit-rotation-policy';

describe('circuitRotationNeedsRotation', () => {
  it('true si nunca ha rotado', () => {
    expect(circuitRotationNeedsRotation(null, new Date('2026-01-02T10:00:00Z'))).toBe(true);
  });

  it('false si la última rotación fue el mismo día UTC', () => {
    const lastRotatedAt = new Date('2026-01-02T01:00:00Z');
    const now = new Date('2026-01-02T23:59:00Z');
    expect(circuitRotationNeedsRotation(lastRotatedAt, now)).toBe(false);
  });

  it('true si la última rotación fue un día UTC distinto', () => {
    const lastRotatedAt = new Date('2026-01-01T23:59:00Z');
    const now = new Date('2026-01-02T00:01:00Z');
    expect(circuitRotationNeedsRotation(lastRotatedAt, now)).toBe(true);
  });
});

describe('selectCircuitsForRotation', () => {
  it('devuelve exactamente count ids sin repetir, si hay candidatos de sobra', () => {
    const selected = selectCircuitsForRotation(['a', 'b', 'c', 'd'], 2, () => 0);
    expect(selected).toHaveLength(2);
    expect(new Set(selected).size).toBe(2);
    for (const id of selected) expect(['a', 'b', 'c', 'd']).toContain(id);
  });

  it('devuelve todos los candidatos si count es mayor o igual', () => {
    const selected = selectCircuitsForRotation(['a', 'b'], 5);
    expect(selected.sort()).toEqual(['a', 'b']);
  });

  it('devuelve vacío si count es 0', () => {
    expect(selectCircuitsForRotation(['a', 'b'], 0)).toEqual([]);
  });

  it('devuelve vacío si no hay candidatos', () => {
    expect(selectCircuitsForRotation([], 3)).toEqual([]);
  });

  it('es determinista con un random inyectado', () => {
    const random = () => 0.5;
    const a = selectCircuitsForRotation(['a', 'b', 'c', 'd', 'e'], 3, random);
    const b = selectCircuitsForRotation(['a', 'b', 'c', 'd', 'e'], 3, random);
    expect(a).toEqual(b);
  });
});
