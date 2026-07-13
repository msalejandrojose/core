import { Injectable } from '@nestjs/common';
import { ACTIVE_RESERVATION_STATUSES } from '@core/shared-types';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import { Reservation } from '../../domain/entities/reservation.entity';
import {
  CreateReservationData,
  ListAllReservationsOptions,
  ListHostReservationsOptions,
  ListMyReservationsOptions,
  ReservationRepositoryPort,
} from '../../application/ports/reservation-repository.port';
import { toReservationDomain } from '../mappers/reservation.mapper';

@Injectable()
export class PrismaReservationRepository implements ReservationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateReservationData): Promise<Reservation> {
    const row = await this.prisma.reservation.create({
      data: {
        parkingId: data.parkingId,
        guestUserId: data.guestUserId,
        startDate: data.startDate,
        endDate: data.endDate,
        totalAmount: data.totalAmount,
      },
    });
    return toReservationDomain(row);
  }

  async updateStatus(
    id: string,
    status: Reservation['status'],
  ): Promise<Reservation> {
    const row = await this.prisma.reservation.update({
      where: { id },
      data: { status },
    });
    return toReservationDomain(row);
  }

  async findByIdForParticipant(
    id: string,
    userId: string,
  ): Promise<Reservation | null> {
    const row = await this.prisma.reservation.findFirst({
      where: {
        id,
        OR: [{ guestUserId: userId }, { parking: { hostUserId: userId } }],
      },
    });
    return row ? toReservationDomain(row) : null;
  }

  async findByIdForHost(
    id: string,
    hostUserId: string,
  ): Promise<Reservation | null> {
    const row = await this.prisma.reservation.findFirst({
      where: { id, parking: { hostUserId } },
    });
    return row ? toReservationDomain(row) : null;
  }

  async listMine(
    opts: ListMyReservationsOptions,
  ): Promise<CursorPage<Reservation>> {
    const filters: Prisma.ReservationWhereInput = {
      guestUserId: opts.guestUserId,
      ...(opts.status ? { status: opts.status } : {}),
    };
    return this.listWithCursor(filters, opts.limit, opts.cursor);
  }

  async listForHost(
    opts: ListHostReservationsOptions,
  ): Promise<CursorPage<Reservation>> {
    const filters: Prisma.ReservationWhereInput = {
      parking: { hostUserId: opts.hostUserId },
      ...(opts.parkingId ? { parkingId: opts.parkingId } : {}),
      ...(opts.status ? { status: opts.status } : {}),
    };
    return this.listWithCursor(filters, opts.limit, opts.cursor);
  }

  async listAll(
    opts: ListAllReservationsOptions,
  ): Promise<CursorPage<Reservation>> {
    const filters: Prisma.ReservationWhereInput = {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.parkingId ? { parkingId: opts.parkingId } : {}),
    };
    return this.listWithCursor(filters, opts.limit, opts.cursor);
  }

  async hasOverlap(
    parkingId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<boolean> {
    const [blockedBy, reservedBy] = await Promise.all([
      this.prisma.parkingAvailabilityBlock.findFirst({
        where: {
          parkingId,
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
        select: { id: true },
      }),
      this.prisma.reservation.findFirst({
        where: {
          parkingId,
          status: { in: [...ACTIVE_RESERVATION_STATUSES] },
          startDate: { lt: endDate },
          endDate: { gt: startDate },
        },
        select: { id: true },
      }),
    ]);
    return blockedBy !== null || reservedBy !== null;
  }

  private async listWithCursor(
    filters: Prisma.ReservationWhereInput,
    limit: number,
    cursor?: string,
  ): Promise<CursorPage<Reservation>> {
    const where: Prisma.ReservationWhereInput = cursor
      ? { AND: [filters, this.cursorWhere(cursor)] }
      : filters;

    const rows = await this.prisma.reservation.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: limit + 1,
    });

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;
    return {
      items: slice.map(toReservationDomain),
      nextCursor: last
        ? CursorCodec.encode({
            id: last.id,
            createdAt: last.createdAt.toISOString(),
          })
        : null,
    };
  }

  private cursorWhere(cursor: string): Prisma.ReservationWhereInput {
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
