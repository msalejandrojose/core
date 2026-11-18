import { createHash } from 'node:crypto';
import { OAuthError } from '../../domain/errors/oauth.error';
import {
  isAllowedRedirectUri,
  normalizeScope,
  verifyPkceS256,
} from '../../domain/services/oauth';
import type {
  OAuthClientRecord,
  OAuthCodeRecord,
  OAuthConnection,
  OAuthRepositoryPort,
  OAuthTokenRecord,
} from '../ports/oauth-repository.port';
import type { TokenIssuerPort } from '../ports/token-issuer.port';
import type { UserRepositoryPort } from '../ports/user-repository.port';
import {
  DecideAuthorizationUseCase,
  IssueOAuthTokenUseCase,
  ManageOAuthConnectionsUseCase,
  RegisterOAuthClientUseCase,
  ValidateAuthorizeRequestUseCase,
  VerifyOAuthAccessTokenUseCase,
} from './oauth.use-cases';

class MemoryRepo implements OAuthRepositoryPort {
  clients: OAuthClientRecord[] = [];
  codes: (OAuthCodeRecord & { codeHash: string })[] = [];
  tokens: (OAuthTokenRecord & {
    accessTokenHash: string;
    refreshTokenHash: string;
  })[] = [];
  private n = 0;
  createClient(d: { clientId: string; name: string; redirectUris: string[] }) {
    const c = { ...d, createdAt: new Date() };
    this.clients.push(c);
    return Promise.resolve(c);
  }
  findClient(id: string) {
    return Promise.resolve(this.clients.find((c) => c.clientId === id) ?? null);
  }
  createCode(d: Omit<OAuthCodeRecord, 'id' | 'usedAt'> & { codeHash: string }) {
    this.codes.push({ ...d, id: `c${++this.n}`, usedAt: null });
    return Promise.resolve();
  }
  findCodeByHash(h: string) {
    return Promise.resolve(this.codes.find((c) => c.codeHash === h) ?? null);
  }
  consumeCode(id: string) {
    const c = this.codes.find((x) => x.id === id)!;
    if (c.usedAt) return Promise.resolve(false);
    c.usedAt = new Date();
    return Promise.resolve(true);
  }
  createToken(
    d: Omit<OAuthTokenRecord, 'id' | 'revokedAt'> & {
      accessTokenHash: string;
      refreshTokenHash: string;
    },
  ) {
    this.tokens.push({ ...d, id: `t${++this.n}`, revokedAt: null });
    return Promise.resolve();
  }
  findTokenByAccessHash(h: string) {
    return Promise.resolve(
      this.tokens.find((t) => t.accessTokenHash === h) ?? null,
    );
  }
  findTokenByRefreshHash(h: string) {
    return Promise.resolve(
      this.tokens.find((t) => t.refreshTokenHash === h) ?? null,
    );
  }
  revokeToken(id: string) {
    const t = this.tokens.find((x) => x.id === id);
    if (t && !t.revokedAt) t.revokedAt = new Date();
    return Promise.resolve();
  }
  revokeAllFor(userId: string, clientId: string) {
    for (const t of this.tokens)
      if (t.userId === userId && t.clientId === clientId && !t.revokedAt)
        t.revokedAt = new Date();
    return Promise.resolve();
  }
  touchToken() {
    return Promise.resolve();
  }
  listConnections(): Promise<OAuthConnection[]> {
    return Promise.resolve([]);
  }
}

const verifier = 'a'.repeat(20) + 'B'.repeat(20) + '-._~123';
const challenge = createHash('sha256').update(verifier).digest('base64url');
const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';
const RESOURCE = 'https://api.brio.test/v1/ritmo/mcp';

function setup() {
  const repo = new MemoryRepo();
  const issuer: TokenIssuerPort = {
    issue: jest.fn(),
    verify: jest.fn((t: string) =>
      t === 'app-jwt'
        ? Promise.resolve({
            sub: 'u1',
            email: 'a@b.c',
            userType: 'APP' as never,
          })
        : Promise.reject(new Error('bad')),
    ),
  };
  const users = {
    findById: jest.fn((id: string) =>
      Promise.resolve(id === 'u1' ? { isActive: true } : null),
    ),
  } as unknown as UserRepositoryPort;
  const validate = new ValidateAuthorizeRequestUseCase(repo);
  return {
    repo,
    register: new RegisterOAuthClientUseCase(repo),
    validate,
    decide: new DecideAuthorizationUseCase(repo, issuer, users, validate),
    tokens: new IssueOAuthTokenUseCase(repo),
    verify: new VerifyOAuthAccessTokenUseCase(repo, users),
    manage: new ManageOAuthConnectionsUseCase(repo),
  };
}

async function authorize(
  s: ReturnType<typeof setup>,
  extra: Record<string, string> = {},
) {
  const client = await s.register.execute({
    client_name: 'Claude',
    redirect_uris: [REDIRECT],
  });
  const params = {
    response_type: 'code',
    client_id: client.clientId,
    redirect_uri: REDIRECT,
    state: 'xyz',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    resource: RESOURCE,
    ...extra,
  };
  const to = new URL(
    await s.decide.execute(params, 'app-jwt', true, 'https://api.brio.test'),
  );
  return { client, params, to, code: to.searchParams.get('code')! };
}

const oauthCode = async (p: Promise<unknown>) => {
  try {
    await p;
    return null;
  } catch (e) {
    return e instanceof OAuthError ? e.code : 'other';
  }
};

describe('reglas OAuth', () => {
  it('PKCE S256', () => {
    expect(verifyPkceS256(verifier, challenge)).toBe(true);
    expect(verifyPkceS256(verifier + 'x', challenge)).toBe(false);
    expect(verifyPkceS256('corto', challenge)).toBe(false);
  });
  it('redirect URIs: https, loopback o esquema de app; nunca http público', () => {
    expect(isAllowedRedirectUri(REDIRECT)).toBe(true);
    expect(isAllowedRedirectUri('http://localhost:6274/oauth/callback')).toBe(
      true,
    );
    expect(isAllowedRedirectUri('com.brio.app:/cb')).toBe(true);
    expect(isAllowedRedirectUri('http://evil.example/cb')).toBe(false);
    expect(isAllowedRedirectUri('https://x.test/cb#frag')).toBe(false);
  });
  it('scope por defecto y desconocidos', () => {
    expect(normalizeScope(undefined)).toBe('ritmo');
    expect(normalizeScope('ritmo ritmo')).toBe('ritmo');
    expect(normalizeScope('admin')).toBeNull();
  });
});

describe('flujo authorization_code', () => {
  it('emite código con state e iss, y lo canjea una sola vez', async () => {
    const s = setup();
    const { client, to, code } = await authorize(s);
    expect(to.origin + to.pathname).toBe(REDIRECT);
    expect(to.searchParams.get('state')).toBe('xyz');
    expect(to.searchParams.get('iss')).toBe('https://api.brio.test');

    const set = await s.tokens.exchangeCode({
      code,
      code_verifier: verifier,
      client_id: client.clientId,
      redirect_uri: REDIRECT,
    });
    expect(set).toMatchObject({
      token_type: 'Bearer',
      scope: 'ritmo',
      expires_in: 3600,
    });
    expect(await s.verify.execute(set.access_token, 'ritmo', RESOURCE)).toEqual(
      { userId: 'u1', clientId: client.clientId, scope: ['ritmo'] },
    );

    // Reutilizar el código: invalid_grant y se revoca lo emitido con él.
    expect(
      await oauthCode(
        s.tokens.exchangeCode({
          code,
          code_verifier: verifier,
          client_id: client.clientId,
        }),
      ),
    ).toBe('invalid_grant');
    expect(await oauthCode(s.verify.execute(set.access_token, 'ritmo'))).toBe(
      'invalid_token',
    );
  });

  it('rechaza verifier, cliente o redirect que no cuadran', async () => {
    const s = setup();
    const { client, code } = await authorize(s);
    expect(
      await oauthCode(
        s.tokens.exchangeCode({
          code,
          code_verifier: 'x'.repeat(43),
          client_id: client.clientId,
        }),
      ),
    ).toBe('invalid_grant');
    const other = await authorize(s);
    expect(
      await oauthCode(
        s.tokens.exchangeCode({
          code: other.code,
          code_verifier: verifier,
          client_id: client.clientId,
        }),
      ),
    ).toBe('invalid_grant');
    expect(
      await oauthCode(
        s.tokens.exchangeCode({
          code: other.code,
          code_verifier: verifier,
          client_id: other.client.clientId,
          redirect_uri: 'https://x.test/cb',
        }),
      ),
    ).toBe('invalid_grant');
  });

  it('sin PKCE o con scope raro vuelve al cliente con el error; con cliente desconocido, no', async () => {
    const s = setup();
    const client = await s.register.execute({ redirect_uris: [REDIRECT] });
    const noPkce = await s.validate.execute({
      response_type: 'code',
      client_id: client.clientId,
      redirect_uri: REDIRECT,
    });
    expect(noPkce.ok).toBe(false);
    if (!noPkce.ok)
      expect(noPkce.redirectTo).toContain('error=invalid_request');
    const unknown = await s.validate.execute({
      response_type: 'code',
      client_id: 'nope',
      redirect_uri: REDIRECT,
    });
    expect(unknown.ok === false && unknown.redirectTo).toBeNull();
  });

  it('denegar devuelve access_denied sin login', async () => {
    const s = setup();
    const { params } = await authorize(s);
    const to = new URL(
      await s.decide.execute(params, '', false, 'https://api.brio.test'),
    );
    expect(to.searchParams.get('error')).toBe('access_denied');
  });

  it('un token de app no válido no autoriza', async () => {
    const s = setup();
    const { params } = await authorize(s);
    expect(
      await oauthCode(s.decide.execute(params, 'forjado', true, 'iss')),
    ).toBe('access_denied');
  });
});

describe('refresh y revocación', () => {
  it('rota el refresh y detecta la reutilización del viejo', async () => {
    const s = setup();
    const { client, code } = await authorize(s);
    const first = await s.tokens.exchangeCode({
      code,
      code_verifier: verifier,
      client_id: client.clientId,
    });
    const second = await s.tokens.refresh({
      refresh_token: first.refresh_token,
      client_id: client.clientId,
    });
    expect(second.access_token).not.toBe(first.access_token);
    expect(await oauthCode(s.verify.execute(first.access_token, 'ritmo'))).toBe(
      'invalid_token',
    );
    // El refresh viejo otra vez = robo: se corta la conexión entera.
    expect(
      await oauthCode(
        s.tokens.refresh({
          refresh_token: first.refresh_token,
          client_id: client.clientId,
        }),
      ),
    ).toBe('invalid_grant');
    expect(
      await oauthCode(s.verify.execute(second.access_token, 'ritmo')),
    ).toBe('invalid_token');
  });

  it('el token vale solo para su recurso y su scope; desconectar lo revoca', async () => {
    const s = setup();
    const { client, code } = await authorize(s);
    const set = await s.tokens.exchangeCode({
      code,
      code_verifier: verifier,
      client_id: client.clientId,
    });
    expect(
      await oauthCode(
        s.verify.execute(set.access_token, 'ritmo', 'https://otra.api/mcp'),
      ),
    ).toBe('invalid_token');
    expect(await oauthCode(s.verify.execute(set.access_token, 'admin'))).toBe(
      'invalid_token',
    );
    await s.manage.revoke('u1', client.clientId);
    expect(await oauthCode(s.verify.execute(set.access_token, 'ritmo'))).toBe(
      'invalid_token',
    );
  });

  it('registro: solo clientes públicos con redirect válidas', async () => {
    const s = setup();
    expect(
      await oauthCode(
        s.register.execute({ redirect_uris: ['http://evil.example/cb'] }),
      ),
    ).toBe('invalid_redirect_uri');
    expect(
      await oauthCode(
        s.register.execute({
          redirect_uris: [REDIRECT],
          token_endpoint_auth_method: 'client_secret_basic',
        }),
      ),
    ).toBe('invalid_client_metadata');
  });
});
