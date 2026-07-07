import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PendingAction } from '../../domain/entities/pending-action.entity';
import {
  CreatePendingActionData,
  FindDuePendingActionsOptions,
  PendingActionRepositoryPort,
} from '../../application/ports/pending-action-repository.port';
import { PendingActionMapper } from '../mappers/pending-action.mapper';

@Injectable()
export class PrismaPendingActionRepository implements PendingActionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePendingActionData): Promise<PendingAction> {
    const row = await this.prisma.pendingAction.create({
      data: {
        runId: data.runId ?? null,
        definitionId: data.definitionId ?? null,
        triggerEventId: data.triggerEventId ?? null,
        stepKey: data.stepKey ?? null,
        kind: data.kind,
        runAt: data.runAt ?? null,
        deadlineAt: data.deadlineAt ?? null,
        eventType: data.eventType ?? null,
        matchExpression:
          data.matchExpression == null
            ? Prisma.DbNull
            : (data.matchExpression as Prisma.InputJsonValue),
        target:
          data.target == null
            ? Prisma.DbNull
            : (data.target as Prisma.InputJsonValue),
      },
    });
    return PendingActionMapper.toDomain(row);
  }

  async listByRun(runId: string): Promise<PendingAction[]> {
    const rows = await this.prisma.pendingAction.findMany({
      where: { runId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => PendingActionMapper.toDomain(r));
  }

  async findDue(opts: FindDuePendingActionsOptions): Promise<PendingAction[]> {
    const rows = await this.prisma.pendingAction.findMany({
      where: {
        status: 'PENDING',
        kind: { in: opts.kinds },
        runAt: { not: null, lte: opts.now },
      },
      orderBy: { runAt: 'asc' },
      take: opts.limit,
    });
    return rows.map((r) => PendingActionMapper.toDomain(r));
  }

  async findPendingWaitEvents(eventType: string): Promise<PendingAction[]> {
    const rows = await this.prisma.pendingAction.findMany({
      where: { status: 'PENDING', kind: 'WAIT_EVENT', eventType },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return rows.map((r) => PendingActionMapper.toDomain(r));
  }

  async markConsumed(
    id: string,
    consumedEventId?: string | null,
  ): Promise<boolean> {
    // updateMany con guard status=PENDING: la reclama como mucho un llamante.
    const { count } = await this.prisma.pendingAction.updateMany({
      where: { id, status: 'PENDING' },
      data: {
        status: 'CONSUMED',
        consumedAt: new Date(),
        consumedEventId: consumedEventId ?? null,
      },
    });
    return count > 0;
  }
}
