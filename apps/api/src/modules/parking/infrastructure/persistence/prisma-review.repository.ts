import { Injectable } from '@nestjs/common';
import type { ReviewAuthorRole } from '@core/shared-types';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import { Review } from '../../domain/entities/review.entity';
import {
  CreateReviewData,
  ListAllReviewsOptions,
  ListParkingReviewsOptions,
  RatingSummary,
  ReviewRepositoryPort,
} from '../../application/ports/review-repository.port';
import { toReviewDomain } from '../mappers/review.mapper';

@Injectable()
export class PrismaReviewRepository implements ReviewRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateReviewData): Promise<Review> {
    const row = await this.prisma.review.create({
      data: {
        reservationId: data.reservationId,
        authorUserId: data.authorUserId,
        authorRole: data.authorRole,
        rating: data.rating,
        comment: data.comment,
      },
    });
    return toReviewDomain(row);
  }

  async findById(id: string): Promise<Review | null> {
    const row = await this.prisma.review.findUnique({ where: { id } });
    return row ? toReviewDomain(row) : null;
  }

  async findByReservationAndRole(
    reservationId: string,
    authorRole: ReviewAuthorRole,
  ): Promise<Review | null> {
    const row = await this.prisma.review.findUnique({
      where: { reservationId_authorRole: { reservationId, authorRole } },
    });
    return row ? toReviewDomain(row) : null;
  }

  async listForReservation(reservationId: string): Promise<Review[]> {
    const rows = await this.prisma.review.findMany({
      where: { reservationId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toReviewDomain);
  }

  async listForParking(
    opts: ListParkingReviewsOptions,
  ): Promise<CursorPage<Review>> {
    const filters: Prisma.ReviewWhereInput = {
      authorRole: 'GUEST',
      reservation: { parkingId: opts.parkingId },
    };
    return this.listWithCursor(filters, opts.limit, opts.cursor);
  }

  async getParkingRatingSummary(parkingId: string): Promise<RatingSummary> {
    const result = await this.prisma.review.aggregate({
      where: { authorRole: 'GUEST', reservation: { parkingId } },
      _avg: { rating: true },
      _count: true,
    });
    return {
      average: result._avg.rating,
      count: result._count,
    };
  }

  async listAll(opts: ListAllReviewsOptions): Promise<CursorPage<Review>> {
    const filters: Prisma.ReviewWhereInput = {
      ...(opts.parkingId ? { reservation: { parkingId: opts.parkingId } } : {}),
    };
    return this.listWithCursor(filters, opts.limit, opts.cursor);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.review.delete({ where: { id } });
  }

  private async listWithCursor(
    filters: Prisma.ReviewWhereInput,
    limit: number,
    cursor?: string,
  ): Promise<CursorPage<Review>> {
    const where: Prisma.ReviewWhereInput = cursor
      ? { AND: [filters, this.cursorWhere(cursor)] }
      : filters;

    const rows = await this.prisma.review.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;
    return {
      items: slice.map(toReviewDomain),
      nextCursor: last
        ? CursorCodec.encode({
            id: last.id,
            createdAt: last.createdAt.toISOString(),
          })
        : null,
    };
  }

  private cursorWhere(cursor: string): Prisma.ReviewWhereInput {
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
