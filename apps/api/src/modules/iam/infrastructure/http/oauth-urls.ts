import type { Request } from 'express';

/**
 * URL pública de la API sin prefijo de versión (el `issuer` de OAuth y la base
 * de los metadatos). `OAUTH_ISSUER_URL` la fija (producción, detrás de un
 * proxy con otro host); si no, sale de la petición (`trust proxy` ya está
 * activo, así que respeta `X-Forwarded-Proto/Host`).
 */
export function publicBaseUrl(req: Request): string {
  const fixed = process.env.OAUTH_ISSUER_URL?.trim();
  if (fixed) return fixed.replace(/\/+$/, '');
  return `${req.protocol}://${req.get('host')}`;
}
