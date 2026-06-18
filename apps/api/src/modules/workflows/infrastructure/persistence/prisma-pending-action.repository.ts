import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PendingAction } from '../../domain/entities/pending-action.entity';
import {
  CreatePendingActionData,
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
        eventType: data.eventType ?? null,
        matchExpression:
          data.matchExpression == null
            ? Prisma.DbNull
            : (data.matchExpression as Prisma.InputJsonValue),
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
}
