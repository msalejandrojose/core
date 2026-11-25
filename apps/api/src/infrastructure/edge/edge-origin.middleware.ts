import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

/** Cabecera con el secreto compartido que añade el Worker de Cloudflare. */
export const EDGE_ORIGIN_AUTH_HEADER = 'x-origin-auth';
/** IP real del cliente tal como la ve Cloudflare (`CF-Connecting-IP`). */
export const EDGE_CLIENT_IP_HEADER = 'x-edge-client-ip';

/** Rutas que siempre pasan: los probes de infra no van por Cloudflare. */
const ALWAYS_ALLOWED = ['/health', '/health/live'];

export interface EdgeOriginOptions {
  /** Secreto compartido con el Worker. Sin él, el middleware no hace nada. */
  secret?: string;
  /** Si es true, rechaza (403) lo que no venga del Worker con el secreto. */
  enforce?: boolean;
}

function headerValue(req: Request, name: string): string | undefined {
  const raw = req.headers[name];
  return (Array.isArray(raw) ? raw[0] : raw)?.trim() || undefined;
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/**
 * La API corre en Cloud Run detrás de Cloudflare (CDN + WAF): el Worker
 * `brio-api-edge` reenvía cada petición a la URL `*.run.app` añadiendo
 * `x-origin-auth` (secreto compartido) y `x-edge-client-ip` (IP real).
 *
 * - Si la petición trae el secreto correcto, `req.ip` pasa a ser la IP real
 *   del cliente; si no, el rate limiter vería la IP de salida de Cloudflare y
 *   todos los usuarios compartirían contador.
 * - Con `enforce`, lo que llegue sin el secreto (alguien que llama directo a
 *   `*.run.app` saltándose el WAF) recibe 403. Se activa cuando las apps ya
 *   usan el dominio de Cloudflare.
 *
 * Sin `secret` (local, tests, o antes de montar Cloudflare) no cambia nada.
 */
export function edgeOriginMiddleware(options: EdgeOriginOptions) {
  const secret = options.secret?.trim();
  const enforce = Boolean(options.enforce);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!secret) return next();

    const provided = headerValue(req, EDGE_ORIGIN_AUTH_HEADER);
    if (provided && safeEqual(provided, secret)) {
      const clientIp = headerValue(req, EDGE_CLIENT_IP_HEADER);
      if (clientIp) {
        Object.defineProperty(req, 'ip', {
          value: clientIp,
          configurable: true,
          enumerable: true,
        });
      }
      return next();
    }

    if (!enforce || ALWAYS_ALLOWED.includes(req.path)) return next();

    res.status(403).json({
      statusCode: 403,
      error: 'Forbidden',
      message: 'Direct origin access is not allowed',
    });
  };
}
