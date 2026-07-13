import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import { HostVerification } from '../../domain/entities/host-verification.entity';
import {
  HostVerificationRepositoryPort,
  ListHostVerificationsOptions,
  ReviewHostVerificationData,
  UpsertHostVerificationData,
} from '../../application/ports/host-verification-repository.port';
import { toHostVerificationDomain } from '../mappers/host-verification.mapper';

@Injectable()
export class PrismaHostVerificationRepository implements HostVerificationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(data: UpsertHostVerificationData): Promise<HostVerification> {
    const row = await this.prisma.hostVerification.upsert({
      where: { hostUserId: data.hostUserId },
      create: {
        hostUserId: data.hostUserId,
        legalName: data.legalName,
        documentFileId: data.documentFileId,
      },
      update: {
        legalName: data.legalName,
        documentFileId: data.documentFileId,
        status: 'PENDING',
        reviewedByUserId: null,
        reviewedAt: null,
        rejectionReason: null,
      },
    });
    return toHostVerificationDomain(row);
  }

  async findById(id: string): Promise<HostVerification | null> {
    const row = await this.prisma.hostVerification.findUnique({
      where: { id },
    });
    return row ? toHostVerificationDomain(row) : null;
  }

  async findByHostUserId(hostUserId: string): Promise<HostVerification | null> {
    const row = await this.prisma.hostVerification.findUnique({
      where: { hostUserId },
    });
    return row ? toHostVerificationDomain(row) : null;
  }

  async list(
    opts: ListHostVerificationsOptions,
  ): Promise<CursorPage<HostVerification>> {
    const filters: Prisma.HostVerificationWhereInput = {
      ...(opts.status ? { status: opts.status } : {}),
    };
    const where: Prisma.HostVerificationWhereInput = opts.cursor
      ? { AND: [filters, this.cursorWhere(opts.cursor)] }
      : filters;

    const rows = await this.prisma.hostVerification.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
    });

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;
    return {
      items: slice.map(toHostVerificationDomain),
      nextCursor: last
        ? CursorCodec.encode({
            id: last.id,
            createdAt: last.createdAt.toISOString(),
          })
        : null,
    };
  }

  async review(
    id: string,
    data: ReviewHostVerificationData,
  ): Promise<HostVerification> {
    const row = await this.prisma.hostVerification.update({
      where: { id },
      data: {
        status: data.status,
        reviewedByUserId: data.reviewedByUserId,
        reviewedAt: new Date(),
        rejectionReason: data.rejectionReason ?? null,
      },
    });
    return toHostVerificationDomain(row);
  }

  private cursorWhere(cursor: string): Prisma.HostVerificationWhereInput {
    const decoded = CursorCodec.decode(cursor);
    const date = new Date(decoded.createdAt);
    return {
      OR: [
        { createdAt: { lt: date } },
        { createdAt: date, id: { gt: decoded.id } },
      ],
    };
  }
}
