/**
 * Reglas de un trazado válido, las mismas que valida
 * `apps/game/tests/track_catalog_test.gd` en el cliente:
 *
 *   - Bucle cerrado: la última celda tiene que ser vecina de la primera.
 *   - Solo movimientos ortogonales de una celda (nada de diagonales ni saltos).
 *   - Sin repetir celda: un cruce no se puede representar con estas piezas.
 *   - La celda 0 es la meta y tiene que ser recta (la anterior y la
 *     siguiente van en la misma dirección), o la salida quedaría atravesada.
 *
 * Hasta ahora el trazado solo vivía en el catálogo del cliente y estas reglas
 * solo se comprobaban ahí. Un circuito que nazca en el servidor (editor del
 * backoffice, TASK-242) no pasa por ese catálogo, así que el servidor no
 * puede seguir confiando en que quien lo construyó las respetó.
 */

export interface TrackCell {
  x: number;
  y: number;
}

export type TrackPathValidationResult =
  | { ok: true }
  | { ok: false; reason: string; details: Record<string, unknown> };

const OK: TrackPathValidationResult = { ok: true };

function reject(
  reason: string,
  details: Record<string, unknown> = {},
): TrackPathValidationResult {
  return { ok: false, reason, details };
}

export function validateTrackPath(
  path: TrackCell[],
): TrackPathValidationResult {
  // Un bucle cerrado sin repetir celda y con pasos ortogonales de una unidad
  // no puede tener menos de 4 celdas (el ciclo más pequeño posible en esta
  // retícula es un cuadrado de 2x2).
  if (path.length < 4) {
    return reject(
      'el trazado no tiene celdas suficientes para cerrar un bucle',
      {
        length: path.length,
      },
    );
  }

  const seen = new Set<string>();
  for (const cell of path) {
    const key = `${cell.x},${cell.y}`;
    if (seen.has(key)) {
      return reject('el trazado repite una celda', { cell });
    }
    seen.add(key);
  }

  for (let i = 0; i < path.length; i++) {
    const from = path[i];
    const to = path[(i + 1) % path.length];
    const step = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
    if (step !== 1) {
      return reject(
        'el trazado no cierra el bucle en pasos ortogonales de una celda',
        { from, to },
      );
    }
  }

  // La meta (celda 0) tiene que caer en recta: en una curva la salida
  // quedaría atravesada respecto al asfalto.
  const last = path[path.length - 1];
  const first = path[0];
  const second = path[1];
  const into = { x: first.x - last.x, y: first.y - last.y };
  const out = { x: second.x - first.x, y: second.y - first.y };
  if (into.x !== out.x || into.y !== out.y) {
    return reject('la meta (celda 0) no cae en recta', { into, out });
  }

  return OK;
}
