import { DomainError } from '../errors/domain-error';

export interface CursorPayload {
  id: string;
  createdAt: string; // ISO-8601
}

export class InvalidCursorError extends DomainError {
  constructor() {
    super('INVALID_CURSOR', 'El cursor de paginación es inválido.');
  }
}

function toBase64url(input: string): string {
  return Buffer.from(input, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64url(input: string): string {
  const pad = (4 - (input.length % 4)) % 4;
  const base64 =
    input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  return Buffer.from(base64, 'base64').toString('utf-8');
}

export const CursorCodec = {
  encode(payload: CursorPayload): string {
    return toBase64url(JSON.stringify(payload));
  },

  decode(cursor: string): CursorPayload {
    try {
      const json = fromBase64url(cursor);
      const parsed: unknown = JSON.parse(json);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        typeof (parsed as Record<string, unknown>).id !== 'string' ||
        typeof (parsed as Record<string, unknown>).createdAt !== 'string'
      ) {
        throw new InvalidCursorError();
      }
      return parsed as CursorPayload;
    } catch (err) {
      if (err instanceof InvalidCursorError) throw err;
      throw new InvalidCursorError();
    }
  },
};
