import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { WorkflowStepExecution } from '../../domain/entities/workflow-step-execution.entity';
import {
  StartStepData,
  WorkflowStepRepositoryPort,
} from '../../application/ports/workflow-step-repository.port';
import { WorkflowStepExecutionMapper } from '../mappers/workflow-step-execution.mapper';

function toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === undefined || value === null ? Prisma.DbNull : value;
}

@Injectable()
export class PrismaWorkflowStepRepository implements WorkflowStepRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async start(data: StartStepData): Promise<WorkflowStepExecution> {
    const row = await this.prisma.workflowStepExecution.create({
      data: {
        runId: data.runId,
        stepKey: data.stepKey,
        actionKey: data.actionKey,
        attempt: data.attempt,
        status: 'RUNNING',
        input: toJson(data.input),
      },
    });
    return WorkflowStepExecutionMapper.toDomain(row);
  }

  async complete(id: string, output: unknown): Promise<void> {
    await this.prisma.workflowStepExecution.update({
      where: { id },
      data: {
        status: 'SUCCEEDED',
        output: toJson(output),
        finishedAt: new Date(),
      },
    });
  }

  async fail(id: string, error: string): Promise<void> {
    await this.prisma.workflowStepExecution.update({
      where: { id },
      data: { status: 'FAILED', error, finishedAt: new Date() },
    });
  }

  async listByRun(runId: string): Promise<WorkflowStepExecution[]> {
    const rows = await this.prisma.workflowStepExecution.findMany({
      where: { runId },
      orderBy: { startedAt: 'asc' },
    });
    return rows.map((r) => WorkflowStepExecutionMapper.toDomain(r));
  }

  async outputsByRun(
    runId: string,
  ): Promise<Record<string, { output: unknown }>> {
    const rows = await this.prisma.workflowStepExecution.findMany({
      where: { runId, status: 'SUCCEEDED' },
      select: { stepKey: true, output: true },
      orderBy: { startedAt: 'asc' },
    });
    const out: Record<string, { output: unknown }> = {};
    for (const row of rows) {
      out[row.stepKey] = { output: row.output };
    }
    return out;
  }
}
