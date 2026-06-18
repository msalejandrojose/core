import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { WorkflowTrigger } from '../../domain/entities/workflow-trigger.entity';
import {
  CreateTriggerData,
  WorkflowTriggerRepositoryPort,
} from '../../application/ports/workflow-trigger-repository.port';
import { WorkflowTriggerMapper } from '../mappers/workflow-trigger.mapper';

@Injectable()
export class PrismaWorkflowTriggerRepository implements WorkflowTriggerRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(triggers: CreateTriggerData[]): Promise<void> {
    if (triggers.length === 0) return;
    await this.prisma.workflowTrigger.createMany({
      data: triggers.map((t) => ({
        definitionId: t.definitionId,
        kind: t.kind,
        eventType: t.eventType ?? null,
        matchExpression:
          t.matchExpression == null
            ? Prisma.DbNull
            : (t.matchExpression as Prisma.InputJsonValue),
        cronExpression: t.cronExpression ?? null,
        cronPayload:
          t.cronPayload == null
            ? Prisma.DbNull
            : (t.cronPayload as Prisma.InputJsonValue),
        nextFireAt: t.nextFireAt ?? null,
      })),
    });
  }

  async findActiveEventTriggers(eventType: string): Promise<WorkflowTrigger[]> {
    const rows = await this.prisma.workflowTrigger.findMany({
      where: {
        kind: 'EVENT',
        eventType,
        definition: { isActive: true },
      },
    });
    return rows.map((r) => WorkflowTriggerMapper.toDomain(r));
  }
}
