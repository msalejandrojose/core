import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import { Payment } from '../../domain/entities/payment.entity';
import {
  CreatePaymentData,
  ListAllPaymentsOptions,
  PaymentRepositoryPort,
  UpdatePaymentPatch,
} from '../../application/ports/payment-repository.port';
import { toPaymentDomain } from '../mappers/payment.mapper';

@Injectable()
export class PrismaPaymentRepository implements PaymentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePaymentData): Promise<Payment> {
    const row = await this.prisma.payment.create({
      data: {
        reservationId: data.reservationId,
        amount: data.amount,
        platformFeeAmount: data.platformFeeAmount,
        hostPayoutAmount: data.hostPayoutAmount,
        provider: data.provider,
        providerCheckoutSessionId: data.providerCheckoutSessionId,
      },
    });
    return toPaymentDomain(row);
  }

  async update(id: string, patch: UpdatePaymentPatch): Promise<Payment> {
    const data: Prisma.PaymentUncheckedUpdateInput = {};
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.providerPaymentIntentId !== undefined)
      data.providerPaymentIntentId = patch.providerPaymentIntentId;
    if (patch.hostPayoutStatus !== undefined)
      data.hostPayoutStatus = patch.hostPayoutStatus;
    if (patch.hostPayoutReleasedAt !== undefined)
      data.hostPayoutReleasedAt = patch.hostPayoutReleasedAt;
    if (patch.paidAt !== undefined) data.paidAt = patch.paidAt;
    if (patch.failedAt !== undefined) data.failedAt = patch.failedAt;
    if (patch.refundedAt !== undefined) data.refundedAt = patch.refundedAt;

    const row = await this.prisma.payment.update({ where: { id }, data });
    return toPaymentDomain(row);
  }

  async findById(id: string): Promise<Payment | null> {
    const row = await this.prisma.payment.findUnique({ where: { id } });
    return row ? toPaymentDomain(row) : null;
  }

  async findByReservationId(reservationId: string): Promise<Payment | null> {
    const row = await this.prisma.payment.findUnique({
      where: { reservationId },
    });
    return row ? toPaymentDomain(row) : null;
  }

  async findByCheckoutSessionId(sessionId: string): Promise<Payment | null> {
    const row = await this.prisma.payment.findUnique({
      where: { providerCheckoutSessionId: sessionId },
    });
    return row ? toPaymentDomain(row) : null;
  }

  async listAll(opts: ListAllPaymentsOptions): Promise<CursorPage<Payment>> {
    const filters: Prisma.PaymentWhereInput = {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.hostPayoutStatus
        ? { hostPayoutStatus: opts.hostPayoutStatus }
        : {}),
    };
    const where: Prisma.PaymentWhereInput = opts.cursor
      ? { AND: [filters, this.cursorWhere(opts.cursor)] }
      : filters;

    const rows = await this.prisma.payment.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
    });

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;
    return {
      items: slice.map(toPaymentDomain),
      nextCursor: last
        ? CursorCodec.encode({
            id: last.id,
            createdAt: last.createdAt.toISOString(),
          })
        : null,
    };
  }

  private cursorWhere(cursor: string): Prisma.PaymentWhereInput {
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
