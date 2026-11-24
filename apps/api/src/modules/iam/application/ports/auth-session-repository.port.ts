import type { SessionTokenMatch } from '../../domain/services/auth-session';

export const AUTH_SESSION_REPOSITORY = Symbol('IAM_AUTH_SESSION_REPOSITORY');

export interface AuthSessionRecord {
  id: string;
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  rotatedAt: Date | null;
}

export interface AuthSessionRepositoryPort {
  create(data: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent: string | null;
  }): Promise<void>;
  /** Busca la sesión cuyo token actual o anterior tiene ese hash. */
  findByTokenHash(
    hash: string,
  ): Promise<{ session: AuthSessionRecord; match: SessionTokenMatch } | null>;
  /**
   * Rota el token solo si sigue siendo `currentHash` (evita que dos refrescos
   * simultáneos roten la misma sesión). Devuelve false si otro se adelantó.
   */
  rotate(
    id: string,
    currentHash: string,
    next: { refreshTokenHash: string; expiresAt: Date; now: Date },
  ): Promise<boolean>;
  revoke(id: string, now: Date): Promise<void>;
}
