import { CursorCodec, InvalidCursorError } from './cursor.codec';

describe('CursorCodec', () => {
  const payload = { id: '018f-uuid-here', createdAt: '2026-01-15T10:30:00.000Z' };

  describe('encode / decode roundtrip', () => {
    it('recovers the original payload', () => {
      const cursor = CursorCodec.encode(payload);
      expect(CursorCodec.decode(cursor)).toEqual(payload);
    });

    it('produces a URL-safe string (no +, /, = chars)', () => {
      const cursor = CursorCodec.encode(payload);
      expect(cursor).toMatch(/^[A-Za-z0-9\-_]+$/);
    });

    it('produces different cursors for different payloads', () => {
      const a = CursorCodec.encode({ id: 'id-1', createdAt: '2026-01-01T00:00:00.000Z' });
      const b = CursorCodec.encode({ id: 'id-2', createdAt: '2026-01-02T00:00:00.000Z' });
      expect(a).not.toBe(b);
    });
  });

  describe('decode — invalid input', () => {
    it('throws InvalidCursorError for a random string', () => {
      expect(() => CursorCodec.decode('not-a-cursor')).toThrow(InvalidCursorError);
    });

    it('throws InvalidCursorError for valid base64url but wrong JSON shape (missing id)', () => {
      const bad = Buffer.from(JSON.stringify({ createdAt: '2026-01-01' }))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      expect(() => CursorCodec.decode(bad)).toThrow(InvalidCursorError);
    });

    it('throws InvalidCursorError for valid base64url but wrong JSON shape (missing createdAt)', () => {
      const bad = Buffer.from(JSON.stringify({ id: 'some-id' }))
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
      expect(() => CursorCodec.decode(bad)).toThrow(InvalidCursorError);
    });

    it('throws InvalidCursorError for truncated cursor (corrupt base64)', () => {
      const valid = CursorCodec.encode(payload);
      expect(() => CursorCodec.decode(valid.slice(0, 5))).toThrow(InvalidCursorError);
    });

    it('throws InvalidCursorError for empty string', () => {
      expect(() => CursorCodec.decode('')).toThrow(InvalidCursorError);
    });
  });

  describe('InvalidCursorError', () => {
    it('has code INVALID_CURSOR', () => {
      const err = new InvalidCursorError();
      expect(err.code).toBe('INVALID_CURSOR');
    });
  });
});
