import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { WorkflowRun } from '../../domain/entities/workflow-run.entity';
import {
  CreateRunData,
  ListRunsOptions,
  UpdateRunData,
  WorkflowRunRepositoryPort,
} from '../../application/ports/workflow-run-repository.port';
import { WorkflowRunMapper } from '../mappers/workflow-run.mapper';

@Injectable()
export class PrismaWorkflowRunRepository implements WorkflowRunRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRunData): Promise<WorkflowRun> {
    const row = await this.prisma.workflowRun.create({
      data: {
        definitionId: data.definitionId,
        triggerEventId: data.triggerEventId ?? null,
        context: (data.context ?? {}) as Prisma.InputJsonValue,
        currentStepKey: data.currentStepKey ?? null,
        isDryRun: data.isDryRun ?? false,
        status: 'RUNNING',
      },
    });
    return WorkflowRunMapper.toDomain(row);
  }

  async findById(id: string): Promise<WorkflowRun | null> {
    const row = await this.prisma.workflowRun.findUnique({ where: { id } });
    return row ? WorkflowRunMapper.toDomain(row) : null;
  }

  async update(id: string, patch: UpdateRunData): Promise<WorkflowRun> {
    const data: Prisma.WorkflowRunUncheckedUpdateInput = {};
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.currentStepKey !== undefined)
      data.currentStepKey = patch.currentStepKey;
    if (patch.finishedAt !== undefined) data.finishedAt = patch.finishedAt;
    if (patch.lastError !== undefined) data.lastError = patch.lastError;
    if (patch.context !== undefined) {
      data.context = patch.context as Prisma.InputJsonValue;
    }
    const row = await this.prisma.workflowRun.update({ where: { id }, data });
    return WorkflowRunMapper.toDomain(row);
  }

  async countActiveByDefinition(definitionId: string): Promise<number> {
    return this.prisma.workflowRun.count({
      where: { definitionId, status: { in: ['RUNNING', 'WAITING'] } },
    });
  }

  async list(opts: ListRunsOptions): Promise<PaginatedResult<WorkflowRun>> {
    const where: Prisma.WorkflowRunWhereInput = {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.definitionId ? { definitionId: opts.definitionId } : {}),
      ...(opts.from ? { startedAt: { gte: opts.from } } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.workflowRun.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        take: opts.limit,
        skip: (opts.page - 1) * opts.limit,
      }),
      this.prisma.workflowRun.count({ where }),
    ]);
    return { items: rows.map((r) => WorkflowRunMapper.toDomain(r)), total };
  }
}
