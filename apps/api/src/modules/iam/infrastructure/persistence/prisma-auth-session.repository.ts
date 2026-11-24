import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type {
  AuthSessionRecord,
  AuthSessionRepositoryPort,
} from '../../application/ports/auth-session-repository.port';
import type { SessionTokenMatch } from '../../domain/services/auth-session';

const SELECT = {
  id: true,
  userId: true,
  expiresAt: true,
  revokedAt: true,
  rotatedAt: true,
  refreshTokenHash: true,
} as const;

@Injectable()
export class PrismaAuthSessionRepository implements AuthSessionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent: string | null;
  }): Promise<void> {
    await this.prisma.authSession.create({
      data: { ...data, lastUsedAt: new Date() },
    });
  }

  async findByTokenHash(
    hash: string,
  ): Promise<{ session: AuthSessionRecord; match: SessionTokenMatch } | null> {
    const row = await this.prisma.authSession.findFirst({
      where: { OR: [{ refreshTokenHash: hash }, { previousTokenHash: hash }] },
      select: SELECT,
    });
    if (!row) return null;
    const { refreshTokenHash, ...session } = row;
    return {
      session,
      match: refreshTokenHash === hash ? 'current' : 'previous',
    };
  }

  async rotate(
    id: string,
    currentHash: string,
    next: { refreshTokenHash: string; expiresAt: Date; now: Date },
  ): Promise<boolean> {
    const { count } = await this.prisma.authSession.updateMany({
      where: { id, refreshTokenHash: currentHash, revokedAt: null },
      data: {
        previousTokenHash: currentHash,
        refreshTokenHash: next.refreshTokenHash,
        rotatedAt: next.now,
        expiresAt: next.expiresAt,
        lastUsedAt: next.now,
      },
    });
    return count === 1;
  }

  async revoke(id: string, now: Date): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}
