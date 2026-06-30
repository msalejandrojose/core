import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import { FormInstance } from '../../domain/entities/form-instance.entity';
import {
  CreateFormInstanceData,
  FormInstanceRepositoryPort,
  ListFormInstancesOptions,
  UpdateFormInstancePatch,
} from '../../application/ports/form-instance-repository.port';

@Injectable()
export class PrismaFormInstanceRepository implements FormInstanceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateFormInstanceData): Promise<FormInstance> {
    const row = await this.prisma.formInstance.create({
      data: {
        formId: data.formId,
        hash: data.hash,
        responsePolicy: data.responsePolicy,
        requiresAuth: data.requiresAuth,
        opensAt: data.opensAt,
        closesAt: data.closesAt,
        maxResponses: data.maxResponses,
        createdById: data.createdById,
      },
    });
    return this.toDomain(row);
  }

  async update(id: string, patch: UpdateFormInstancePatch): Promise<FormInstance> {
    const data: Prisma.FormInstanceUncheckedUpdateInput = {};
    if (patch.responsePolicy !== undefined) data.responsePolicy = patch.responsePolicy;
    if (patch.requiresAuth !== undefined) data.requiresAuth = patch.requiresAuth;
    if (patch.opensAt !== undefined) data.opensAt = patch.opensAt;
    if (patch.closesAt !== undefined) data.closesAt = patch.closesAt;
    if (patch.maxResponses !== undefined) data.maxResponses = patch.maxResponses;
    if (patch.status !== undefined) data.status = patch.status;

    const row = await this.prisma.formInstance.update({ where: { id }, data });
    return this.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.formInstance.delete({ where: { id } });
  }

  async findById(id: string): Promise<FormInstance | null> {
    const row = await this.prisma.formInstance.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByHash(hash: string): Promise<FormInstance | null> {
    const row = await this.prisma.formInstance.findUnique({ where: { hash } });
    return row ? this.toDomain(row) : null;
  }

  async list(opts: ListFormInstancesOptions): Promise<CursorPage<FormInstance>> {
    const where: Prisma.FormInstanceWhereInput = opts.cursor
      ? { AND: [{ formId: opts.formId }, this.cursorWhere(opts.cursor)] }
      : { formId: opts.formId };

    const rows = await this.prisma.formInstance.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
    });

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;
    return {
      items: slice.map((r) => this.toDomain(r)),
      nextCursor: last
        ? CursorCodec.encode({ id: last.id, createdAt: last.createdAt.toISOString() })
        : null,
    };
  }

  async countResponses(instanceId: string): Promise<number> {
    return this.prisma.formResponse.count({ where: { formInstanceId: instanceId } });
  }

  private cursorWhere(cursor: string): Prisma.FormInstanceWhereInput {
    const decoded = CursorCodec.decode(cursor);
    const date = new Date(decoded.createdAt);
    return {
      OR: [
        { createdAt: { lt: date } },
        { createdAt: date, id: { gt: decoded.id } },
      ],
    };
  }

  private toDomain(row: {
    id: string; formId: string; hash: string; responsePolicy: string;
    requiresAuth: boolean; opensAt: Date | null; closesAt: Date | null;
    maxResponses: number | null; status: string; createdById: string | null;
    createdAt: Date; updatedAt: Date;
  }): FormInstance {
    return {
      id: row.id,
      formId: row.formId,
      hash: row.hash,
      responsePolicy: row.responsePolicy as FormInstance['responsePolicy'],
      requiresAuth: row.requiresAuth,
      opensAt: row.opensAt,
      closesAt: row.closesAt,
      maxResponses: row.maxResponses,
      status: row.status as FormInstance['status'],
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
