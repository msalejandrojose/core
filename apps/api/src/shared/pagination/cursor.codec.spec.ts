import { CursorCodec, CursorPayload } from './cursor.codec';
import { InvalidCursorError } from './errors/invalid-cursor.error';

describe('CursorCodec', () => {
  const payload: CursorPayload = {
    id: '01HW3X8VQK0001',
    createdAt: '2026-06-15T10:00:00.000Z',
  };

  it('encode + decode es round-trip identidad', () => {
    const cursor = CursorCodec.encode(payload);
    expect(typeof cursor).toBe('string');
    // base64url no usa `=` ni `+/`.
    expect(cursor).not.toMatch(/[+/=]/);
    expect(CursorCodec.decode(cursor)).toEqual(payload);
  });

  it('decode lanza InvalidCursorError con base64 inválido', () => {
    expect(() => CursorCodec.decode('!!!not-base64!!!')).toThrow(
      InvalidCursorError,
    );
  });

  it('decode lanza InvalidCursorError con JSON inválido', () => {
    const corrupt = Buffer.from('not json', 'utf8').toString('base64url');
    expect(() => CursorCodec.decode(corrupt)).toThrow(InvalidCursorError);
  });

  it('decode lanza InvalidCursorError cuando faltan campos obligatorios', () => {
    const missing = Buffer.from(JSON.stringify({ id: 'x' }), 'utf8').toString(
      'base64url',
    );
    expect(() => CursorCodec.decode(missing)).toThrow(InvalidCursorError);
  });

  it('decode lanza InvalidCursorError con cursor vacío o no-string', () => {
    expect(() => CursorCodec.decode('')).toThrow(InvalidCursorError);
    // @ts-expect-error — probando la guarda de tipo en runtime.
    expect(() => CursorCodec.decode(null)).toThrow(InvalidCursorError);
  });

  it('tryDecode devuelve null si no hay cursor', () => {
    expect(CursorCodec.tryDecode(null)).toBeNull();
    expect(CursorCodec.tryDecode(undefined)).toBeNull();
    expect(CursorCodec.tryDecode('')).toBeNull();
  });

  it('tryDecode delega en decode cuando hay cursor', () => {
    const cursor = CursorCodec.encode(payload);
    expect(CursorCodec.tryDecode(cursor)).toEqual(payload);
  });

  it('encode preserva campos extra serializables', () => {
    const withExtra: CursorPayload = {
      ...payload,
      extra: { roleId: '01ROLE', kind: 'admin', total: 12, flagged: false },
    };
    const cursor = CursorCodec.encode(withExtra);
    expect(CursorCodec.decode(cursor)).toEqual(withExtra);
  });
});
