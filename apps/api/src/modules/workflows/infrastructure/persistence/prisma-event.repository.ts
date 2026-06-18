import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { WorkflowEvent } from '../../domain/entities/event.entity';
import {
  CreateEventData,
  EventRepositoryPort,
  ListEventsOptions,
} from '../../application/ports/event-repository.port';
import { WorkflowEventMapper } from '../mappers/event.mapper';

@Injectable()
export class PrismaEventRepository implements EventRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEventData): Promise<WorkflowEvent> {
    const row = await this.prisma.workflowEvent.create({
      data: {
        type: data.type,
        payload: data.payload ?? {},
        sourceUserId: data.sourceUserId ?? null,
        correlationId: data.correlationId ?? null,
        idempotencyKey: data.idempotencyKey ?? null,
      },
    });
    return WorkflowEventMapper.toDomain(row);
  }

  async findByIdempotencyKey(key: string): Promise<WorkflowEvent | null> {
    const row = await this.prisma.workflowEvent.findUnique({
      where: { idempotencyKey: key },
    });
    return row ? WorkflowEventMapper.toDomain(row) : null;
  }

  async findById(id: string): Promise<WorkflowEvent | null> {
    const row = await this.prisma.workflowEvent.findUnique({ where: { id } });
    return row ? WorkflowEventMapper.toDomain(row) : null;
  }

  async list(opts: ListEventsOptions): Promise<PaginatedResult<WorkflowEvent>> {
    const where: Prisma.WorkflowEventWhereInput = {
      ...(opts.type ? { type: opts.type } : {}),
      ...(opts.from || opts.to
        ? {
            occurredAt: {
              ...(opts.from ? { gte: opts.from } : {}),
              ...(opts.to ? { lte: opts.to } : {}),
            },
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.workflowEvent.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        take: opts.limit,
        skip: (opts.page - 1) * opts.limit,
      }),
      this.prisma.workflowEvent.count({ where }),
    ]);
    return { items: rows.map((r) => WorkflowEventMapper.toDomain(r)), total };
  }

  async distinctTypes(): Promise<string[]> {
    const rows = await this.prisma.workflowEvent.findMany({
      distinct: ['type'],
      select: { type: true },
      orderBy: { type: 'asc' },
    });
    return rows.map((r) => r.type);
  }
}
