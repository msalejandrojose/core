import { Inject, Injectable } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { SessionExpiredError } from '../../domain/errors/session-expired.error';
import {
  SESSION_TTL_MS,
  decideRefresh,
} from '../../domain/services/auth-session';
import { newSecret, sha256Hex } from '../../domain/services/oauth';
import {
  AUTH_SESSION_REPOSITORY,
  type AuthSessionRepositoryPort,
} from '../ports/auth-session-repository.port';
import { TOKEN_ISSUER, type TokenIssuerPort } from '../ports/token-issuer.port';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../ports/user-repository.port';

export interface RefreshedSession {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/** Máximo que guardamos del User-Agent (solo sirve para reconocer el dispositivo). */
const UA_MAX = 255;

/**
 * Sesiones de la app con refresh token: se abren al iniciar sesión, se
 * renuevan sin pedir login y se cierran al salir. Ver `domain/services/auth-session`.
 */
@Injectable()
export class AuthSessionsUseCase {
  constructor(
    @Inject(AUTH_SESSION_REPOSITORY)
    private readonly sessions: AuthSessionRepositoryPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuerPort,
  ) {}

  /** Abre una sesión para un usuario recién autenticado y devuelve su refresh token. */
  async open(userId: string, userAgent?: string | null): Promise<string> {
    const refreshToken = newSecret();
    await this.sessions.create({
      userId,
      refreshTokenHash: sha256Hex(refreshToken),
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      userAgent: userAgent ? userAgent.slice(0, UA_MAX) : null,
    });
    return refreshToken;
  }

  /** Cambia un refresh token válido por un par nuevo (access + refresh). */
  async refresh(
    refreshToken: string,
    userAgent?: string | null,
  ): Promise<RefreshedSession> {
    const hash = sha256Hex(refreshToken);
    const found = await this.sessions.findByTokenHash(hash);
    if (!found) throw new SessionExpiredError();

    const now = new Date();
    const { session, match } = found;
    const decision = decideRefresh(session, match, now);
    if (decision.kind === 'revoke') {
      await this.sessions.revoke(session.id, now);
      throw new SessionExpiredError();
    }
    if (decision.kind === 'reject') throw new SessionExpiredError();

    const user = await this.users.findById(session.userId);
    if (!user || user.isDeactivated()) {
      await this.sessions.revoke(session.id, now);
      throw new SessionExpiredError();
    }

    let nextRefresh: string;
    if (decision.kind === 'rotate') {
      nextRefresh = newSecret();
      const rotated = await this.sessions.rotate(session.id, hash, {
        refreshTokenHash: sha256Hex(nextRefresh),
        expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
        now,
      });
      // Otro refresco simultáneo se adelantó: su token ya es el bueno y el
      // nuestro pasa a ser el anterior, así que se abre una sesión hermana.
      if (!rotated) nextRefresh = await this.open(user.id, userAgent);
    } else {
      nextRefresh = await this.open(user.id, userAgent);
    }

    const accessToken = await this.tokens.issue({
      sub: user.id,
      email: user.email,
      userType: user.userType,
    });
    return { accessToken, refreshToken: nextRefresh, user };
  }

  /** Cierra la sesión de este refresh token (salir de la cuenta). Idempotente. */
  async close(refreshToken: string): Promise<void> {
    const found = await this.sessions.findByTokenHash(sha256Hex(refreshToken));
    if (found) await this.sessions.revoke(found.session.id, new Date());
  }
}
