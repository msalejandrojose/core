import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  CreateGoogleAuthSessionData,
  GoogleAuthSessionRepositoryPort,
  MarkGoogleAuthSessionReadyData,
} from '../../application/ports/google-auth-session-repository.port';
import { GoogleAuthSession } from '../../domain/entities/google-auth-session.entity';
import { toGoogleAuthSessionDomain } from './google-auth-session.mapper';

@Injectable()
export class PrismaGoogleAuthSessionRepository
  implements GoogleAuthSessionRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateGoogleAuthSessionData): Promise<GoogleAuthSession> {
    const row = await this.prisma.googleAuthSession.create({ data });
    return toGoogleAuthSessionDomain(row);
  }

  async findById(id: string): Promise<GoogleAuthSession | null> {
    const row = await this.prisma.googleAuthSession.findUnique({
      where: { id },
    });
    return row === null ? null : toGoogleAuthSessionDomain(row);
  }

  async findByState(state: string): Promise<GoogleAuthSession | null> {
    const row = await this.prisma.googleAuthSession.findUnique({
      where: { state },
    });
    return row === null ? null : toGoogleAuthSessionDomain(row);
  }

  async markReady(
    id: string,
    data: MarkGoogleAuthSessionReadyData,
  ): Promise<GoogleAuthSession> {
    const row = await this.prisma.googleAuthSession.update({
      where: { id },
      data: { status: 'READY', accessToken: data.accessToken, userId: data.userId },
    });
    return toGoogleAuthSessionDomain(row);
  }

  async markFailed(id: string, reason: string): Promise<GoogleAuthSession> {
    const row = await this.prisma.googleAuthSession.update({
      where: { id },
      data: { status: 'FAILED', failureReason: reason },
    });
    return toGoogleAuthSessionDomain(row);
  }
}
