import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { Invitation } from '../../domain/entities/invitation.entity';
import {
  CreateInvitationData,
  InvitationRepositoryPort,
} from '../../application/ports/invitation-repository.port';
import { InvitationMapper } from '../mappers/invitation.mapper';

@Injectable()
export class PrismaInvitationRepository implements InvitationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateInvitationData): Promise<Invitation> {
    const row = await this.prisma.invitation.create({
      data: {
        id: randomUUID(),
        code: data.code,
        createdByUserId: data.createdByUserId,
        expiresAt: data.expiresAt,
      },
    });
    return InvitationMapper.toDomain(row);
  }

  async findByCode(code: string): Promise<Invitation | null> {
    const row = await this.prisma.invitation.findUnique({ where: { code } });
    return row ? InvitationMapper.toDomain(row) : null;
  }

  async markAsUsed(id: string, usedByUserId: string): Promise<void> {
    await this.prisma.invitation.update({
      where: { id },
      data: { usedByUserId },
    });
  }

  async countActiveByUser(createdByUserId: string, now: Date): Promise<number> {
    return this.prisma.invitation.count({
      where: {
        createdByUserId,
        usedByUserId: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    });
  }
}
