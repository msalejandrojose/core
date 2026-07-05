import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import { LeadActivity } from '../../domain/entities/lead-activity.entity';
import {
  CreateLeadActivityData,
  LeadActivityRepositoryPort,
  ListLeadActivitiesOptions,
} from '../../application/ports/lead-activity-repository.port';
import { toLeadActivityDomain } from '../mappers/lead-activity.mapper';

@Injectable()
export class PrismaLeadActivityRepository implements LeadActivityRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async append(data: CreateLeadActivityData): Promise<LeadActivity> {
    const row = await this.prisma.leadActivity.create({
      data: {
        leadId: data.leadId,
        type: data.type,
        body: data.body,
        meta:
          data.meta === null || data.meta === undefined
            ? Prisma.DbNull
            : (data.meta as Prisma.InputJsonValue),
        actorId: data.actorId,
      },
    });
    return toLeadActivityDomain(row);
  }

  async listByLead(
    leadId: string,
    opts: ListLeadActivitiesOptions,
  ): Promise<CursorPage<LeadActivity>> {
    const where: Prisma.LeadActivityWhereInput = opts.cursor
      ? { AND: [{ leadId }, this.cursorWhere(opts.cursor)] }
      : { leadId };

    const rows = await this.prisma.leadActivity.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
    });

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;
    return {
      items: slice.map(toLeadActivityDomain),
      nextCursor: last
        ? CursorCodec.encode({
            id: last.id,
            createdAt: last.createdAt.toISOString(),
          })
        : null,
    };
  }

  private cursorWhere(cursor: string): Prisma.LeadActivityWhereInput {
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
