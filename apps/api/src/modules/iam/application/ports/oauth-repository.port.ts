export const OAUTH_REPOSITORY = Symbol('IAM_OAUTH_REPOSITORY');

export interface OAuthClientRecord {
  clientId: string;
  name: string;
  redirectUris: string[];
  createdAt: Date;
}

export interface OAuthCodeRecord {
  id: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  scope: string;
  resource: string | null;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface OAuthTokenRecord {
  id: string;
  clientId: string;
  userId: string;
  scope: string;
  resource: string | null;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
  revokedAt: Date | null;
}

/** Conexión de un usuario con un cliente (para listarlas y revocarlas). */
export interface OAuthConnection {
  clientId: string;
  clientName: string;
  scope: string;
  connectedAt: Date;
  lastUsedAt: Date | null;
}

export interface OAuthRepositoryPort {
  createClient(data: {
    clientId: string;
    name: string;
    redirectUris: string[];
  }): Promise<OAuthClientRecord>;
  findClient(clientId: string): Promise<OAuthClientRecord | null>;

  createCode(
    data: Omit<OAuthCodeRecord, 'id' | 'usedAt'> & { codeHash: string },
  ): Promise<void>;
  findCodeByHash(codeHash: string): Promise<OAuthCodeRecord | null>;
  /** Marca el código como usado solo si no lo estaba. false = ya se había usado (replay). */
  consumeCode(id: string): Promise<boolean>;

  createToken(
    data: Omit<OAuthTokenRecord, 'id' | 'revokedAt'> & {
      accessTokenHash: string;
      refreshTokenHash: string;
    },
  ): Promise<void>;
  findTokenByAccessHash(hash: string): Promise<OAuthTokenRecord | null>;
  findTokenByRefreshHash(hash: string): Promise<OAuthTokenRecord | null>;
  revokeToken(id: string): Promise<void>;
  /** Revoca todo lo emitido para ese usuario y cliente (desconectar / replay de código). */
  revokeAllFor(userId: string, clientId: string): Promise<void>;
  touchToken(id: string): Promise<void>;
  listConnections(userId: string): Promise<OAuthConnection[]>;
}
