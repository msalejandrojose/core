import type { TrackCellRow } from '../types';

// Réplica en el cliente de las reglas de
// `apps/api/src/modules/racing/domain/track-path.ts`. El editor solo permite
// clicar celdas adyacentes y sin repetir (ver TrackPathCanvas), así que en la
// práctica las únicas dos reglas que de verdad pueden fallar aquí son el
// mínimo de celdas y la meta en recta al cerrar el bucle — pero se replican
// las cuatro para dar el mismo mensaje que devolvería la API si, por lo que
// sea, se guarda un trazado construido de otra forma (o llega por versiones
// futuras del editor, como el pintado de terreno).
export type TrackPathValidation =
  | { ok: true }
  | { ok: false; reason: string };

export function validateTrackPath(path: TrackCellRow[]): TrackPathValidation {
  if (path.length < 4) {
    return {
      ok: false,
      reason: 'El trazado necesita al menos 4 celdas para cerrar un bucle.',
    };
  }

  const seen = new Set<string>();
  for (const cell of path) {
    const key = `${cell.x},${cell.y}`;
    if (seen.has(key)) {
      return { ok: false, reason: 'El trazado repite una celda.' };
    }
    seen.add(key);
  }

  for (let i = 0; i < path.length; i++) {
    const from = path[i];
    const to = path[(i + 1) % path.length];
    const step = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
    if (step !== 1) {
      return {
        ok: false,
        reason:
          'El trazado no cierra el bucle en pasos ortogonales de una celda.',
      };
    }
  }

  const last = path[path.length - 1];
  const first = path[0];
  const second = path[1];
  const into = { x: first.x - last.x, y: first.y - last.y };
  const out = { x: second.x - first.x, y: second.y - first.y };
  if (into.x !== out.x || into.y !== out.y) {
    return {
      ok: false,
      reason:
        'La meta (celda 0) no cae en recta — cierra el bucle por otro lado.',
    };
  }

  return { ok: true };
}
