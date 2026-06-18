import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { WorkflowDefinition } from '../../domain/entities/workflow-definition.entity';
import {
  CreateDefinitionData,
  ListDefinitionsOptions,
  WorkflowDefinitionRepositoryPort,
} from '../../application/ports/workflow-definition-repository.port';
import { WorkflowDefinitionMapper } from '../mappers/workflow-definition.mapper';

@Injectable()
export class PrismaWorkflowDefinitionRepository implements WorkflowDefinitionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateDefinitionData): Promise<WorkflowDefinition> {
    const row = await this.prisma.workflowDefinition.create({
      data: {
        key: data.key,
        version: data.version,
        name: data.name,
        description: data.description,
        dsl: data.dsl as Prisma.InputJsonValue,
        isActive: data.isActive,
        publishedAt: new Date(),
      },
    });
    return WorkflowDefinitionMapper.toDomain(row);
  }

  async findById(id: string): Promise<WorkflowDefinition | null> {
    const row = await this.prisma.workflowDefinition.findUnique({
      where: { id },
    });
    return row ? WorkflowDefinitionMapper.toDomain(row) : null;
  }

  async findActiveByKey(key: string): Promise<WorkflowDefinition | null> {
    const row = await this.prisma.workflowDefinition.findFirst({
      where: { key, isActive: true },
    });
    return row ? WorkflowDefinitionMapper.toDomain(row) : null;
  }

  async findByKeyVersion(
    key: string,
    version: number,
  ): Promise<WorkflowDefinition | null> {
    const row = await this.prisma.workflowDefinition.findUnique({
      where: { key_version: { key, version } },
    });
    return row ? WorkflowDefinitionMapper.toDomain(row) : null;
  }

  async listVersions(key: string): Promise<WorkflowDefinition[]> {
    const rows = await this.prisma.workflowDefinition.findMany({
      where: { key },
      orderBy: { version: 'desc' },
    });
    return rows.map((r) => WorkflowDefinitionMapper.toDomain(r));
  }

  async list(
    opts: ListDefinitionsOptions,
  ): Promise<PaginatedResult<WorkflowDefinition>> {
    const where: Prisma.WorkflowDefinitionWhereInput = opts.onlyActive
      ? { isActive: true }
      : {};
    const [rows, total] = await Promise.all([
      this.prisma.workflowDefinition.findMany({
        where,
        orderBy: [{ key: 'asc' }, { version: 'desc' }],
        take: opts.limit,
        skip: (opts.page - 1) * opts.limit,
      }),
      this.prisma.workflowDefinition.count({ where }),
    ]);
    return {
      items: rows.map((r) => WorkflowDefinitionMapper.toDomain(r)),
      total,
    };
  }

  async hasAnyVersion(key: string): Promise<boolean> {
    const count = await this.prisma.workflowDefinition.count({
      where: { key },
    });
    return count > 0;
  }

  async setActiveVersion(key: string, version: number): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.workflowDefinition.updateMany({
        where: { key },
        data: { isActive: false },
      }),
      this.prisma.workflowDefinition.update({
        where: { key_version: { key, version } },
        data: { isActive: true },
      }),
    ]);
  }
}
