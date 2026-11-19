import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type {
  OAuthClientRecord,
  OAuthCodeRecord,
  OAuthConnection,
  OAuthRepositoryPort,
  OAuthTokenRecord,
} from '../../application/ports/oauth-repository.port';

const toClient = (r: {
  clientId: string;
  name: string;
  redirectUris: unknown;
  createdAt: Date;
}): OAuthClientRecord => ({
  clientId: r.clientId,
  name: r.name,
  redirectUris: Array.isArray(r.redirectUris)
    ? (r.redirectUris as string[])
    : [],
  createdAt: r.createdAt,
});

const TOKEN_SELECT = {
  id: true,
  clientId: true,
  userId: true,
  scope: true,
  resource: true,
  accessExpiresAt: true,
  refreshExpiresAt: true,
  revokedAt: true,
} as const;

@Injectable()
export class PrismaOAuthRepository implements OAuthRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createClient(data: {
    clientId: string;
    name: string;
    redirectUris: string[];
  }): Promise<OAuthClientRecord> {
    return toClient(await this.prisma.oAuthClient.create({ data }));
  }

  async findClient(clientId: string): Promise<OAuthClientRecord | null> {
    const row = await this.prisma.oAuthClient.findUnique({
      where: { clientId },
    });
    return row ? toClient(row) : null;
  }

  async createCode(
    data: Omit<OAuthCodeRecord, 'id' | 'usedAt'> & { codeHash: string },
  ): Promise<void> {
    await this.prisma.oAuthAuthorizationCode.create({ data });
  }

  findCodeByHash(codeHash: string): Promise<OAuthCodeRecord | null> {
    return this.prisma.oAuthAuthorizationCode.findUnique({
      where: { codeHash },
      select: {
        id: true,
        clientId: true,
        userId: true,
        redirectUri: true,
        codeChallenge: true,
        scope: true,
        resource: true,
        expiresAt: true,
        usedAt: true,
      },
    });
  }

  async consumeCode(id: string): Promise<boolean> {
    // Condicional: dos canjes simultáneos del mismo código, solo uno gana.
    const { count } = await this.prisma.oAuthAuthorizationCode.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: new Date() },
    });
    return count === 1;
  }

  async createToken(
    data: Omit<OAuthTokenRecord, 'id' | 'revokedAt'> & {
      accessTokenHash: string;
      refreshTokenHash: string;
    },
  ): Promise<void> {
    await this.prisma.oAuthToken.create({ data });
  }

  findTokenByAccessHash(hash: string): Promise<OAuthTokenRecord | null> {
    return this.prisma.oAuthToken.findUnique({
      where: { accessTokenHash: hash },
      select: TOKEN_SELECT,
    });
  }

  findTokenByRefreshHash(hash: string): Promise<OAuthTokenRecord | null> {
    return this.prisma.oAuthToken.findUnique({
      where: { refreshTokenHash: hash },
      select: TOKEN_SELECT,
    });
  }

  async revokeToken(id: string): Promise<void> {
    await this.prisma.oAuthToken.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllFor(userId: string, clientId: string): Promise<void> {
    await this.prisma.oAuthToken.updateMany({
      where: { userId, clientId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async touchToken(id: string): Promise<void> {
    await this.prisma.oAuthToken
      .update({ where: { id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }

  async listConnections(userId: string): Promise<OAuthConnection[]> {
    const rows = await this.prisma.oAuthToken.findMany({
      where: { userId, revokedAt: null, refreshExpiresAt: { gt: new Date() } },
      select: {
        clientId: true,
        scope: true,
        createdAt: true,
        lastUsedAt: true,
        client: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    // Un cliente puede tener varios pares vivos (varios dispositivos): una conexión por cliente.
    const byClient = new Map<string, OAuthConnection>();
    for (const r of rows) {
      const prev = byClient.get(r.clientId);
      const last =
        [prev?.lastUsedAt, r.lastUsedAt]
          .filter((d): d is Date => !!d)
          .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
      byClient.set(r.clientId, {
        clientId: r.clientId,
        clientName: r.client.name,
        scope: r.scope,
        connectedAt: prev?.connectedAt ?? r.createdAt,
        lastUsedAt: last,
      });
    }
    return [...byClient.values()];
  }
}
