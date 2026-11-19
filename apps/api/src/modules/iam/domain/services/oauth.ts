import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Reglas del servidor de autorización OAuth 2.1 (para conectores externos como
 * los clientes MCP). Solo flujo `authorization_code` con PKCE S256 y clientes
 * públicos; los secretos (códigos y tokens) se guardan como hash SHA-256.
 */

/** Scopes que se pueden pedir, con el texto que ve el usuario al autorizar. */
export const OAUTH_SCOPES: Record<string, string> = {
  brio: 'Ver y apuntar tus datos de Brío en tu nombre: tu día, comidas, entrenos, peso, progreso y plan de entreno.',
};
export const DEFAULT_SCOPE = 'brio';

export const CODE_TTL_MS = 5 * 60 * 1000;
export const ACCESS_TTL_MS = 60 * 60 * 1000;
export const REFRESH_TTL_MS = 60 * 24 * 60 * 60 * 1000;

const base64url = (buf: Buffer) => buf.toString('base64url');

/** Secreto opaco (código, access o refresh token). */
export function newSecret(bytes = 32): string {
  return base64url(randomBytes(bytes));
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** RFC 7636: BASE64URL(SHA256(verifier)) === challenge, en tiempo constante. */
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false;
  const expected = Buffer.from(
    base64url(createHash('sha256').update(verifier).digest()),
  );
  const given = Buffer.from(challenge);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/**
 * Redirect URIs admitidas al registrar un cliente: https, o http solo contra
 * loopback (clientes nativos/CLI, RFC 8252). Sin fragmento.
 */
export function isAllowedRedirectUri(uri: string): boolean {
  let u: URL;
  try {
    u = new URL(uri);
  } catch {
    return false;
  }
  if (u.hash) return false;
  if (u.protocol === 'https:') return true;
  if (u.protocol === 'http:')
    return ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  // Esquemas propios de apps nativas (com.example.app:/callback).
  return /^[a-z][a-z0-9+.-]*\.[a-z0-9+.-]+:$/i.test(u.protocol);
}

/** Normaliza el scope pedido: vacío → el de por defecto; desconocidos → null. */
export function normalizeScope(
  scope: string | undefined | null,
): string | null {
  const parts = (scope ?? '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) return DEFAULT_SCOPE;
  if (parts.some((p) => !(p in OAUTH_SCOPES))) return null;
  return [...new Set(parts)].join(' ');
}
