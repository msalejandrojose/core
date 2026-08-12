import { Track } from './entities/track.entity';

/**
 * Validación de un tiempo de vuelta.
 *
 * Punto de partida honesto: **el cliente es autoritativo sobre el tiempo**. En
 * un juego que se juega entero sin red, el servidor no ve la partida, así que
 * no puede verificar nada de verdad. Nada de lo que hay aquí impide a alguien
 * decidido inventarse un tiempo plausible.
 *
 * Lo que sí hace, y por eso existe desde el primer día, es cerrar el abuso
 * trivial: mandar un cero, un tiempo negativo, splits inventados o repetir el
 * mismo POST cien veces. Retrofit sobre un leaderboard ya contaminado no tiene
 * arreglo — no se puede distinguir a posteriori qué tiempos eran buenos.
 *
 * Criterio en las dudas: **preferimos dejar pasar a un tramposo sutil antes que
 * llamar tramposo a alguien que solo es rápido.** Todos los límites están
 * puestos donde la vuelta es imposible, no donde es sospechosa.
 */

export interface LapSubmission {
  durationMs: number;
  splitsMs: number[];
  clientVersion: string;
}

export interface LapValidationContext {
  track: Track;
  /** Instante del intento anterior de este jugador, si lo hay. */
  previousAttemptAt: Date | null;
  now: Date;
}

export type LapValidationResult =
  | { ok: true }
  | { ok: false; reason: string; details: Record<string, unknown> };

const OK: LapValidationResult = { ok: true };

function reject(
  reason: string,
  details: Record<string, unknown> = {},
): LapValidationResult {
  return { ok: false, reason, details };
}

export function validateLap(
  submission: LapSubmission,
  context: LapValidationContext,
): LapValidationResult {
  const { durationMs, splitsMs } = submission;
  const { track } = context;

  if (!Number.isInteger(durationMs) || durationMs <= 0) {
    return reject('la duración no es un entero positivo de milisegundos', {
      durationMs,
    });
  }

  // Barrera física: recorrer el circuito exige cubrir su longitud, y el coche
  // no pasa de su velocidad punta. Por debajo de esto la vuelta es imposible se
  // conduzca como se conduzca (ver el cálculo en `seed-racing.ts`).
  if (durationMs < track.minPlausibleMs) {
    return reject('por debajo del mínimo físico del circuito', {
      durationMs,
      minPlausibleMs: track.minPlausibleMs,
    });
  }

  if (splitsMs.length !== track.sectorCount) {
    return reject('el número de sectores no es el del circuito', {
      got: splitsMs.length,
      expected: track.sectorCount,
    });
  }

  // Los splits son acumulados desde la salida, así que tienen que crecer
  // siempre. Uno que retrocede significa un array inventado a mano.
  let previous = 0;
  for (const [index, split] of splitsMs.entries()) {
    if (!Number.isInteger(split) || split <= previous) {
      return reject('los splits no crecen de forma estricta', {
        index,
        split,
        previous,
      });
    }
    previous = split;
  }

  // Y el último es, por definición, el tiempo total: es el cruce de meta.
  const last = splitsMs[splitsMs.length - 1];
  if (last !== durationMs) {
    return reject('el último split no coincide con la duración', {
      last,
      durationMs,
    });
  }

  // No se puede terminar una vuelta antes de haberla podido correr. Esto es lo
  // que corta el reenvío en bucle del mismo tiempo: la pared no es el número de
  // peticiones, es que el tiempo real no da para tantas vueltas.
  if (context.previousAttemptAt !== null) {
    const elapsedMs =
      context.now.getTime() - context.previousAttemptAt.getTime();
    if (elapsedMs < durationMs) {
      return reject('llega antes de que diera tiempo a correr la vuelta', {
        elapsedMs,
        durationMs,
      });
    }
  }

  return OK;
}
