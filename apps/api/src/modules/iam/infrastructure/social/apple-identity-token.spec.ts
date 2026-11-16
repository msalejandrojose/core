import { generateKeyPairSync, sign } from 'node:crypto';
import {
  AppleTokenError,
  verifyAppleIdentityToken,
  type AppleJwk,
} from './apple-identity-token';

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const other = generateKeyPairSync('rsa', { modulusLength: 2048 });
const KEYS: AppleJwk[] = [
  { ...publicKey.export({ format: 'jwk' }), kid: 'K1', alg: 'RS256' },
];
const NOW = new Date('2026-11-16T10:00:00Z');
const nowSec = Math.floor(NOW.getTime() / 1000);

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');

function token(
  claims: Record<string, unknown>,
  opts: { kid?: string; key?: typeof privateKey } = {},
): string {
  const head = b64({ alg: 'RS256', kid: opts.kid ?? 'K1' });
  const body = b64({
    iss: 'https://appleid.apple.com',
    aud: 'es.aj.brio',
    sub: '001234.abc',
    exp: nowSec + 600,
    email: 'ana@privaterelay.appleid.com',
    ...claims,
  });
  const sig = sign(
    'RSA-SHA256',
    Buffer.from(`${head}.${body}`),
    opts.key ?? privateKey,
  );
  return `${head}.${body}.${sig.toString('base64url')}`;
}

const check = (t: string) =>
  verifyAppleIdentityToken(t, KEYS, { audiences: ['es.aj.brio'], now: NOW });

const problem = (t: string) => {
  try {
    check(t);
    return null;
  } catch (e) {
    return e instanceof AppleTokenError ? e.problem : 'OTHER';
  }
};

describe('verifyAppleIdentityToken', () => {
  it('acepta un token bien firmado para esta app', () => {
    expect(check(token({}))).toMatchObject({
      sub: '001234.abc',
      email: 'ana@privaterelay.appleid.com',
    });
  });

  it('rechaza firma de otra clave, clave desconocida, otro emisor, otra app y caducado', () => {
    expect(problem(token({}, { key: other.privateKey }))).toBe('BAD_SIGNATURE');
    expect(problem(token({}, { kid: 'K9' }))).toBe('UNKNOWN_KEY');
    expect(problem(token({ iss: 'https://evil.example' }))).toBe('BAD_ISSUER');
    expect(problem(token({ aud: 'com.otra.app' }))).toBe('BAD_AUDIENCE');
    expect(problem(token({ exp: nowSec - 3600 }))).toBe('EXPIRED');
    expect(problem('no.es.jwt.valido')).toBe('MALFORMED');
  });

  it('detecta que se ha tocado el contenido después de firmar', () => {
    const [h, , s] = token({}).split('.');
    const forged = `${h}.${b64({ iss: 'https://appleid.apple.com', aud: 'es.aj.brio', sub: 'otro', exp: nowSec + 600 })}.${s}`;
    expect(problem(forged)).toBe('BAD_SIGNATURE');
  });
});
