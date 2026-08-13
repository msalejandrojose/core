import { TrackCell, validateTrackPath } from './track-path';

// Los cuatro trazados reales del catálogo del cliente
// (apps/game/scripts/track/track_catalog.gd), celda a celda. Si el servidor
// rechazara alguno de estos, rechazaría un circuito que ya se juega hoy.
const KENNEY: TrackCell[] = [
  { x: 0, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: 2 },
  { x: -1, y: 2 },
  { x: -2, y: 2 },
  { x: -2, y: 1 },
  { x: -2, y: 0 },
  { x: -2, y: -1 },
  { x: -3, y: -1 },
  { x: -3, y: -2 },
  { x: -3, y: -3 },
  { x: -2, y: -3 },
  { x: -1, y: -3 },
  { x: 0, y: -3 },
  { x: 0, y: -2 },
  { x: 0, y: -1 },
];

const HERRADURA: TrackCell[] = [
  { x: 0, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: 2 },
  { x: 0, y: 3 },
  { x: 0, y: 4 },
  { x: -1, y: 4 },
  { x: -2, y: 4 },
  { x: -2, y: 3 },
  { x: -2, y: 2 },
  { x: -3, y: 2 },
  { x: -4, y: 2 },
  { x: -4, y: 1 },
  { x: -4, y: 0 },
  { x: -4, y: -1 },
  { x: -3, y: -1 },
  { x: -2, y: -1 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
];

const CHICANE: TrackCell[] = [
  { x: 0, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: 2 },
  { x: -1, y: 2 },
  { x: -1, y: 3 },
  { x: -2, y: 3 },
  { x: -2, y: 2 },
  { x: -3, y: 2 },
  { x: -3, y: 1 },
  { x: -3, y: 0 },
  { x: -3, y: -1 },
  { x: -2, y: -1 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
];

const NEVADO: TrackCell[] = [
  { x: 0, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: 2 },
  { x: 0, y: 3 },
  { x: -1, y: 3 },
  { x: -2, y: 3 },
  { x: -2, y: 2 },
  { x: -2, y: 1 },
  { x: -3, y: 1 },
  { x: -4, y: 1 },
  { x: -4, y: 2 },
  { x: -4, y: 3 },
  { x: -5, y: 3 },
  { x: -6, y: 3 },
  { x: -6, y: 2 },
  { x: -6, y: 1 },
  { x: -6, y: 0 },
  { x: -6, y: -1 },
  { x: -5, y: -1 },
  { x: -4, y: -1 },
  { x: -3, y: -1 },
  { x: -3, y: -2 },
  { x: -2, y: -2 },
  { x: -2, y: -1 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
];

describe('validateTrackPath', () => {
  it.each([
    ['kenney-01', KENNEY],
    ['herradura', HERRADURA],
    ['chicane', CHICANE],
    ['nevado', NEVADO],
  ])('acepta el trazado real de %s', (_id, path) => {
    expect(validateTrackPath(path).ok).toBe(true);
  });

  it('rechaza un trazado con menos de 4 celdas', () => {
    const result = validateTrackPath([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]);
    expect(result.ok).toBe(false);
  });

  it('rechaza una celda repetida', () => {
    const result = validateTrackPath([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
      { x: 1, y: 0 },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('repite');
  });

  it('rechaza un paso diagonal', () => {
    const result = validateTrackPath([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('ortogonales');
  });

  it('rechaza un salto de más de una celda', () => {
    const result = validateTrackPath([
      { x: 0, y: 0 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 1, y: 0 },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('ortogonales');
  });

  it('rechaza un bucle que no cierra (última celda no vecina de la primera)', () => {
    const result = validateTrackPath([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('ortogonales');
  });

  it('rechaza una meta que cae en curva, no en recta', () => {
    // Cuadrado 2x2: en la celda 0 se entra subiendo (desde abajo) y se sale
    // girando a la derecha, no en línea recta.
    const result = validateTrackPath([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('recta');
  });
});
