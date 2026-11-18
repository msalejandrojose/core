import { Inject, Injectable } from '@nestjs/common';
import { OAuthError } from '../../domain/errors/oauth.error';
import {
  ACCESS_TTL_MS,
  CODE_TTL_MS,
  OAUTH_SCOPES,
  REFRESH_TTL_MS,
  isAllowedRedirectUri,
  newSecret,
  normalizeScope,
  sha256Hex,
  verifyPkceS256,
} from '../../domain/services/oauth';
import {
  OAUTH_REPOSITORY,
  type OAuthClientRecord,
  type OAuthConnection,
  type OAuthRepositoryPort,
} from '../ports/oauth-repository.port';
import { TOKEN_ISSUER, type TokenIssuerPort } from '../ports/token-issuer.port';
import {
  USER_REPOSITORY,
  type UserRepositoryPort,
} from '../ports/user-repository.port';

export interface ClientRegistration {
  client_name?: string;
  redirect_uris?: unknown;
  grant_types?: unknown;
  response_types?: unknown;
  token_endpoint_auth_method?: string;
}

export interface TokenSet {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  scope: string;
}

/** Parámetros de `/oauth/authorize` (query del cliente). */
export interface AuthorizeParams {
  response_type?: string;
  client_id?: string;
  redirect_uri?: string;
  state?: string;
  scope?: string;
  code_challenge?: string;
  code_challenge_method?: string;
  resource?: string;
}

/** Petición de autorización ya validada, lista para pedir login y consentimiento. */
export interface ValidAuthorizeRequest {
  client: OAuthClientRecord;
  redirectUri: string;
  scope: string;
  scopeLabels: string[];
  state: string | null;
  codeChallenge: string;
  resource: string | null;
}

/**
 * Resultado de validar `/authorize`. RFC 6749 §4.1.2.1: si el cliente o la
 * redirect URI no son válidos NO se redirige (se enseña el error); el resto de
 * errores sí vuelven al cliente por la redirect URI.
 */
export type AuthorizeValidation =
  | { ok: true; request: ValidAuthorizeRequest }
  | { ok: false; error: OAuthError; redirectTo: string | null };

/** Añade parámetros a la redirect URI del cliente (respetando su query). */
export function redirectWith(
  uri: string,
  params: Record<string, string | null | undefined>,
): string {
  const u = new URL(uri);
  for (const [k, v] of Object.entries(params)) if (v) u.searchParams.set(k, v);
  return u.toString();
}

@Injectable()
export class RegisterOAuthClientUseCase {
  constructor(
    @Inject(OAUTH_REPOSITORY) private readonly repo: OAuthRepositoryPort,
  ) {}

  async execute(
    body: ClientRegistration,
  ): Promise<OAuthClientRecord & { tokenEndpointAuthMethod: 'none' }> {
    const uris = body.redirect_uris;
    if (
      !Array.isArray(uris) ||
      uris.length === 0 ||
      uris.length > 10 ||
      uris.some((u) => typeof u !== 'string')
    ) {
      throw new OAuthError(
        'invalid_redirect_uri',
        'redirect_uris debe ser una lista de 1 a 10 URLs.',
      );
    }
    const bad = (uris as string[]).find((u) => !isAllowedRedirectUri(u));
    if (bad)
      throw new OAuthError(
        'invalid_redirect_uri',
        `Redirect URI no admitida: ${bad}`,
      );
    const method = body.token_endpoint_auth_method ?? 'none';
    if (method !== 'none') {
      throw new OAuthError(
        'invalid_client_metadata',
        'Solo se admiten clientes públicos (token_endpoint_auth_method=none) con PKCE.',
      );
    }
    const grants = Array.isArray(body.grant_types)
      ? body.grant_types
      : ['authorization_code'];
    if (
      grants.some((g) => g !== 'authorization_code' && g !== 'refresh_token')
    ) {
      throw new OAuthError(
        'invalid_client_metadata',
        'Solo se admiten los grants authorization_code y refresh_token.',
      );
    }
    const name =
      (typeof body.client_name === 'string'
        ? body.client_name.trim()
        : ''
      ).slice(0, 200) || 'Aplicación externa';
    const client = await this.repo.createClient({
      clientId: newSecret(18),
      name,
      redirectUris: uris as string[],
    });
    return { ...client, tokenEndpointAuthMethod: 'none' };
  }
}

@Injectable()
export class ValidateAuthorizeRequestUseCase {
  constructor(
    @Inject(OAUTH_REPOSITORY) private readonly repo: OAuthRepositoryPort,
  ) {}

  async execute(p: AuthorizeParams): Promise<AuthorizeValidation> {
    const client = p.client_id ? await this.repo.findClient(p.client_id) : null;
    if (!client)
      return {
        ok: false,
        error: new OAuthError('invalid_client', 'Cliente desconocido.'),
        redirectTo: null,
      };
    const redirectUri =
      p.redirect_uri ??
      (client.redirectUris.length === 1 ? client.redirectUris[0] : undefined);
    if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
      return {
        ok: false,
        error: new OAuthError(
          'invalid_request',
          'redirect_uri no registrada para este cliente.',
        ),
        redirectTo: null,
      };
    }
    const fail = (
      code: OAuthError['code'],
      msg: string,
    ): AuthorizeValidation => ({
      ok: false,
      error: new OAuthError(code, msg),
      redirectTo: redirectWith(redirectUri, {
        error: code,
        error_description: msg,
        state: p.state,
      }),
    });
    if (p.response_type !== 'code')
      return fail('unsupported_response_type', 'Solo response_type=code.');
    if (!p.code_challenge || p.code_challenge_method !== 'S256') {
      return fail(
        'invalid_request',
        'PKCE obligatorio: code_challenge con code_challenge_method=S256.',
      );
    }
    if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(p.code_challenge))
      return fail('invalid_request', 'code_challenge no válido.');
    const scope = normalizeScope(p.scope);
    if (!scope) return fail('invalid_scope', 'Scope desconocido.');
    return {
      ok: true,
      request: {
        client,
        redirectUri,
        scope,
        scopeLabels: scope.split(' ').map((s) => OAUTH_SCOPES[s]),
        state: p.state ?? null,
        codeChallenge: p.code_challenge,
        resource: p.resource ?? null,
      },
    };
  }
}

/**
 * El usuario ha iniciado sesión (con cualquiera de los métodos de la app, que
 * dan un access token de IAM) y acepta o rechaza. Devuelve a dónde volver.
 */
@Injectable()
export class DecideAuthorizationUseCase {
  constructor(
    @Inject(OAUTH_REPOSITORY) private readonly repo: OAuthRepositoryPort,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuerPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    private readonly validate: ValidateAuthorizeRequestUseCase,
  ) {}

  async execute(
    params: AuthorizeParams,
    userAccessToken: string,
    approve: boolean,
    issuer: string,
  ): Promise<string> {
    const v = await this.validate.execute(params);
    if (!v.ok) {
      if (v.redirectTo) return v.redirectTo;
      throw v.error;
    }
    const r = v.request;
    if (!approve) {
      return redirectWith(r.redirectUri, {
        error: 'access_denied',
        error_description: 'El usuario no ha dado permiso.',
        state: r.state,
        iss: issuer,
      });
    }
    let userId: string;
    try {
      userId = (await this.tokens.verify(userAccessToken)).sub;
    } catch {
      throw new OAuthError(
        'access_denied',
        'Sesión no válida: vuelve a iniciar sesión.',
        401,
      );
    }
    const user = await this.users.findById(userId);
    if (!user || !user.isActive)
      throw new OAuthError('access_denied', 'Cuenta no activa.', 403);

    const code = newSecret();
    await this.repo.createCode({
      codeHash: sha256Hex(code),
      clientId: r.client.clientId,
      userId,
      redirectUri: r.redirectUri,
      codeChallenge: r.codeChallenge,
      scope: r.scope,
      resource: r.resource,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    });
    return redirectWith(r.redirectUri, { code, state: r.state, iss: issuer });
  }
}

@Injectable()
export class IssueOAuthTokenUseCase {
  constructor(
    @Inject(OAUTH_REPOSITORY) private readonly repo: OAuthRepositoryPort,
  ) {}

  async exchangeCode(p: {
    code?: string;
    code_verifier?: string;
    client_id?: string;
    redirect_uri?: string;
    resource?: string;
  }): Promise<TokenSet> {
    if (!p.code || !p.code_verifier || !p.client_id) {
      throw new OAuthError(
        'invalid_request',
        'Faltan code, code_verifier o client_id.',
      );
    }
    const record = await this.repo.findCodeByHash(sha256Hex(p.code));
    if (!record || record.clientId !== p.client_id)
      throw new OAuthError('invalid_grant', 'Código no válido.');
    if (record.usedAt) {
      // Un código reutilizado indica robo: se invalida todo lo que emitió (RFC 6749 §4.1.2).
      await this.repo.revokeAllFor(record.userId, record.clientId);
      throw new OAuthError('invalid_grant', 'Código ya usado.');
    }
    if (record.expiresAt.getTime() < Date.now())
      throw new OAuthError('invalid_grant', 'Código caducado.');
    if (p.redirect_uri && p.redirect_uri !== record.redirectUri)
      throw new OAuthError('invalid_grant', 'redirect_uri no coincide.');
    if (!verifyPkceS256(p.code_verifier, record.codeChallenge))
      throw new OAuthError('invalid_grant', 'code_verifier no válido.');
    if (p.resource && record.resource && p.resource !== record.resource)
      throw new OAuthError('invalid_grant', 'resource no coincide.');
    if (!(await this.repo.consumeCode(record.id)))
      throw new OAuthError('invalid_grant', 'Código ya usado.');
    return this.issue(
      record.userId,
      record.clientId,
      record.scope,
      record.resource,
    );
  }

  async refresh(p: {
    refresh_token?: string;
    client_id?: string;
    scope?: string;
  }): Promise<TokenSet> {
    if (!p.refresh_token || !p.client_id)
      throw new OAuthError(
        'invalid_request',
        'Faltan refresh_token o client_id.',
      );
    const t = await this.repo.findTokenByRefreshHash(
      sha256Hex(p.refresh_token),
    );
    if (!t || t.clientId !== p.client_id)
      throw new OAuthError('invalid_grant', 'Refresh token no válido.');
    if (t.revokedAt) {
      // Refresh token ya rotado reutilizado: se corta la conexión entera.
      await this.repo.revokeAllFor(t.userId, t.clientId);
      throw new OAuthError('invalid_grant', 'Refresh token revocado.');
    }
    if (t.refreshExpiresAt.getTime() < Date.now())
      throw new OAuthError('invalid_grant', 'Refresh token caducado.');
    let scope = t.scope;
    if (p.scope) {
      const asked = normalizeScope(p.scope);
      if (
        !asked ||
        asked.split(' ').some((s) => !t.scope.split(' ').includes(s))
      ) {
        throw new OAuthError(
          'invalid_scope',
          'No se puede ampliar el scope al refrescar.',
        );
      }
      scope = asked;
    }
    await this.repo.revokeToken(t.id);
    return this.issue(t.userId, t.clientId, scope, t.resource);
  }

  private async issue(
    userId: string,
    clientId: string,
    scope: string,
    resource: string | null,
  ): Promise<TokenSet> {
    const access = newSecret();
    const refresh = newSecret();
    const now = Date.now();
    await this.repo.createToken({
      accessTokenHash: sha256Hex(access),
      refreshTokenHash: sha256Hex(refresh),
      clientId,
      userId,
      scope,
      resource,
      accessExpiresAt: new Date(now + ACCESS_TTL_MS),
      refreshExpiresAt: new Date(now + REFRESH_TTL_MS),
    });
    return {
      access_token: access,
      token_type: 'Bearer',
      expires_in: ACCESS_TTL_MS / 1000,
      refresh_token: refresh,
      scope,
    };
  }
}

export interface OAuthPrincipal {
  userId: string;
  clientId: string;
  scope: string[];
}

/** Lo usan los servidores de recursos (p. ej. el MCP de ritmo) para autenticar. */
@Injectable()
export class VerifyOAuthAccessTokenUseCase {
  constructor(
    @Inject(OAUTH_REPOSITORY) private readonly repo: OAuthRepositoryPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
  ) {}

  async execute(
    token: string,
    requiredScope: string,
    resource?: string,
  ): Promise<OAuthPrincipal> {
    const t = token
      ? await this.repo.findTokenByAccessHash(sha256Hex(token))
      : null;
    if (!t || t.revokedAt || t.accessExpiresAt.getTime() < Date.now()) {
      throw new OAuthError('invalid_token', 'Token no válido o caducado.', 401);
    }
    const scopes = t.scope.split(' ');
    if (!scopes.includes(requiredScope))
      throw new OAuthError(
        'invalid_token',
        `Falta el scope ${requiredScope}.`,
        403,
      );
    // Audiencia (RFC 8707): un token pedido para otro recurso no vale aquí.
    if (resource && t.resource && t.resource !== resource)
      throw new OAuthError(
        'invalid_token',
        'Token emitido para otro recurso.',
        401,
      );
    const user = await this.users.findById(t.userId);
    if (!user || !user.isActive)
      throw new OAuthError('invalid_token', 'Cuenta no activa.', 401);
    void this.repo.touchToken(t.id);
    return { userId: t.userId, clientId: t.clientId, scope: scopes };
  }
}

@Injectable()
export class ManageOAuthConnectionsUseCase {
  constructor(
    @Inject(OAUTH_REPOSITORY) private readonly repo: OAuthRepositoryPort,
  ) {}

  list(userId: string): Promise<OAuthConnection[]> {
    return this.repo.listConnections(userId);
  }

  revoke(userId: string, clientId: string): Promise<void> {
    return this.repo.revokeAllFor(userId, clientId);
  }

  /** RFC 7009: revocar un token concreto (access o refresh). Siempre "ok". */
  async revokeToken(token: string): Promise<void> {
    const hash = sha256Hex(token);
    const t =
      (await this.repo.findTokenByAccessHash(hash)) ??
      (await this.repo.findTokenByRefreshHash(hash));
    if (t && !t.revokedAt) await this.repo.revokeToken(t.id);
  }
}
