import { createPublicKey, verify, type JsonWebKey } from 'node:crypto';

/**
 * Verificación del identity token de Sign in with Apple (un JWT RS256 firmado
 * con las claves públicas de https://appleid.apple.com/auth/keys). Puro y sin
 * dependencias: las claves llegan como parámetro para poder probarlo.
 */

export const APPLE_ISSUER = 'https://appleid.apple.com';

export interface AppleJwk extends JsonWebKey {
  kid: string;
  alg?: string;
}

export interface AppleClaims {
  iss: string;
  aud: string;
  sub: string;
  exp: number;
  iat?: number;
  email?: string;
  /** Apple lo manda como booleano o como texto «true». */
  email_verified?: boolean | string;
  is_private_email?: boolean | string;
}

export type AppleTokenProblem =
  | 'MALFORMED'
  | 'UNKNOWN_KEY'
  | 'BAD_SIGNATURE'
  | 'BAD_ISSUER'
  | 'BAD_AUDIENCE'
  | 'EXPIRED';

export class AppleTokenError extends Error {
  constructor(readonly problem: AppleTokenProblem) {
    super(problem);
  }
}

const b64url = (s: string) => Buffer.from(s, 'base64url');

function parse<T>(part: string): T {
  try {
    return JSON.parse(b64url(part).toString('utf8')) as T;
  } catch {
    throw new AppleTokenError('MALFORMED');
  }
}

/** `kid` de la cabecera, para buscar (o refrescar) la clave. */
export function tokenKeyId(token: string): string {
  const [header] = token.split('.');
  if (!header) throw new AppleTokenError('MALFORMED');
  const h = parse<{ kid?: string; alg?: string }>(header);
  if (!h.kid || h.alg !== 'RS256') throw new AppleTokenError('MALFORMED');
  return h.kid;
}

export function verifyAppleIdentityToken(
  token: string,
  keys: AppleJwk[],
  opts: { audiences: string[]; now?: Date; leewaySec?: number },
): AppleClaims {
  const parts = token.split('.');
  if (parts.length !== 3) throw new AppleTokenError('MALFORMED');
  const [header, payload, signature] = parts;
  const kid = tokenKeyId(token);
  const jwk = keys.find((k) => k.kid === kid);
  if (!jwk) throw new AppleTokenError('UNKNOWN_KEY');

  const ok = verify(
    'RSA-SHA256',
    Buffer.from(`${header}.${payload}`),
    createPublicKey({ key: jwk, format: 'jwk' }),
    b64url(signature),
  );
  if (!ok) throw new AppleTokenError('BAD_SIGNATURE');

  const claims = parse<AppleClaims>(payload);
  if (claims.iss !== APPLE_ISSUER) throw new AppleTokenError('BAD_ISSUER');
  if (!opts.audiences.includes(claims.aud))
    throw new AppleTokenError('BAD_AUDIENCE');
  const now = Math.floor((opts.now ?? new Date()).getTime() / 1000);
  if (!claims.exp || claims.exp + (opts.leewaySec ?? 60) < now)
    throw new AppleTokenError('EXPIRED');
  if (!claims.sub) throw new AppleTokenError('MALFORMED');
  return claims;
}
