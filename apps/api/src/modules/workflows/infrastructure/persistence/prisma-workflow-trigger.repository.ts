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
        target:
          t.target == null
            ? Prisma.DbNull
            : (t.target as Prisma.InputJsonValue),
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

  async findDueCronTriggers(now: Date): Promise<WorkflowTrigger[]> {
    const rows = await this.prisma.workflowTrigger.findMany({
      where: {
        kind: 'CRON',
        definition: { isActive: true },
        OR: [{ nextFireAt: null }, { nextFireAt: { lte: now } }],
      },
    });
    return rows.map((r) => WorkflowTriggerMapper.toDomain(r));
  }

  async claimCronSlot(
    id: string,
    expected: Date | null,
    nextFireAt: Date,
  ): Promise<boolean> {
    // updateMany con guard sobre `nextFireAt = expected`: solo una instancia
    // reclama el slot (las demás verán 0 filas afectadas). `expected = null`
    // se traduce a `IS NULL` (trigger recién creado, aún sin programar).
    const { count } = await this.prisma.workflowTrigger.updateMany({
      where: { id, nextFireAt: expected },
      data: { nextFireAt },
    });
    return count > 0;
  }
}
