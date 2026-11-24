/**
 * Reglas de las sesiones de la app (refresh token). El access token es un JWT
 * corto (`JWT_EXPIRES_IN`, 60 min por defecto); el refresh token lo renueva sin
 * pedir login mientras el dispositivo abra la app al menos una vez cada
 * `SESSION_TTL_MS`: cada refresco rota el token y alarga la caducidad.
 */

/** Sin abrir la app en este tiempo, hay que volver a iniciar sesión. */
export const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Margen para reutilizar el refresh token recién rotado. Cubre que la
 * respuesta del refresco se pierda (cobertura, app cerrada a medias): el
 * cliente vuelve con el token anterior y recibe uno nuevo en vez de quedarse
 * fuera. Pasado el margen, reutilizarlo se trata como robo y corta la sesión.
 */
export const ROTATION_GRACE_MS = 10 * 60 * 1000;

export type SessionTokenMatch = 'current' | 'previous';

export interface AuthSessionState {
  expiresAt: Date;
  revokedAt: Date | null;
  rotatedAt: Date | null;
}

export type RefreshDecision =
  | { kind: 'rotate' }
  /** Token anterior dentro del margen: se abre una sesión hermana. */
  | { kind: 'fork' }
  /** Token anterior fuera del margen: posible robo, se revoca la sesión. */
  | { kind: 'revoke' }
  | { kind: 'reject' };

/** Qué hacer con un refresh token presentado, según la sesión que lo reconoce. */
export function decideRefresh(
  session: AuthSessionState,
  match: SessionTokenMatch,
  now: Date,
): RefreshDecision {
  if (session.revokedAt) return { kind: 'reject' };
  if (session.expiresAt.getTime() <= now.getTime()) return { kind: 'reject' };
  if (match === 'current') return { kind: 'rotate' };
  const rotatedAt = session.rotatedAt?.getTime() ?? 0;
  return now.getTime() - rotatedAt <= ROTATION_GRACE_MS
    ? { kind: 'fork' }
    : { kind: 'revoke' };
}
