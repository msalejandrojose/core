import { InvalidCursorError } from './errors/invalid-cursor.error';

/**
 * Payload mínimo que se serializa dentro de un cursor opaco. Pensado para
 * keyset pagination ordenado por `createdAt` con `id` como tiebreaker
 * estable. Si en el futuro un endpoint necesita un cursor distinto, puede
 * añadir campos opcionales a `extra` y validarlos en su propio use case.
 */
export interface CursorPayload {
  id: string;
  createdAt: string;
  extra?: Record<string, string | number | boolean | null>;
}

/**
 * Codec del cursor opaco. No va firmado: el cursor solo decide el siguiente
 * offset, no autoriza nada. Si en el futuro algún endpoint expone datos
 * sensibles a través del cursor, habrá que añadir HMAC.
 */
export const CursorCodec = {
  /**
   * Codifica un payload como base64url. Compatible con URLs sin necesidad
   * de percent-encoding adicional.
   */
  encode(payload: CursorPayload): string {
    const json = JSON.stringify(payload);
    return Buffer.from(json, 'utf8').toString('base64url');
  },

  /**
   * Decodifica un cursor base64url a `CursorPayload`. Si el cursor no es
   * válido (base64 mal formado, JSON corrupto, claves obligatorias
   * ausentes), lanza `InvalidCursorError`.
   */
  decode(cursor: string): CursorPayload {
    if (!cursor || typeof cursor !== 'string') {
      throw new InvalidCursorError();
    }

    let decoded: string;
    try {
      decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    } catch {
      throw new InvalidCursorError();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(decoded);
    } catch {
      throw new InvalidCursorError();
    }

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof (parsed as CursorPayload).id !== 'string' ||
      typeof (parsed as CursorPayload).createdAt !== 'string'
    ) {
      throw new InvalidCursorError();
    }

    return parsed as CursorPayload;
  },

  /**
   * Helper para `tryDecode` cuando el caller prefiere `null` en vez de una
   * excepción. Útil en use cases que aceptan `cursor` opcional.
   */
  tryDecode(cursor: string | undefined | null): CursorPayload | null {
    if (cursor === undefined || cursor === null || cursor === '') {
      return null;
    }
    return CursorCodec.decode(cursor);
  },
};
