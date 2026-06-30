import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import { Form } from '../../domain/entities/form.entity';
import {
  CreateFormData,
  FormRepositoryPort,
  ListFormsOptions,
  UpdateFormPatch,
} from '../../application/ports/form-repository.port';

@Injectable()
export class PrismaFormRepository implements FormRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateFormData): Promise<Form> {
    const row = await this.prisma.form.create({
      data: {
        title: data.title,
        description: data.description,
        schema: data.schema as Prisma.InputJsonValue,
        createdById: data.createdById,
      },
    });
    return this.toDomain(row);
  }

  async update(id: string, patch: UpdateFormPatch): Promise<Form> {
    const data: Prisma.FormUncheckedUpdateInput = {};
    if (patch.title !== undefined) data.title = patch.title;
    if (patch.description !== undefined) data.description = patch.description;
    if (patch.schema !== undefined) data.schema = patch.schema as Prisma.InputJsonValue;
    if (patch.status !== undefined) data.status = patch.status;

    const row = await this.prisma.form.update({ where: { id }, data });
    return this.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.form.delete({ where: { id } });
  }

  async findById(id: string): Promise<Form | null> {
    const row = await this.prisma.form.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async list(opts: ListFormsOptions): Promise<CursorPage<Form>> {
    const filters: Prisma.FormWhereInput = {
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.titleContains ? { title: { contains: opts.titleContains } } : {}),
    };

    const where: Prisma.FormWhereInput = opts.cursor
      ? { AND: [filters, this.cursorWhere(opts.cursor)] }
      : filters;

    const rows = await this.prisma.form.findMany({
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

  private cursorWhere(cursor: string): Prisma.FormWhereInput {
    const decoded = CursorCodec.decode(cursor);
    const date = new Date(decoded.createdAt);
    return {
      OR: [
        { createdAt: { lt: date } },
        { createdAt: date, id: { gt: decoded.id } },
      ],
    };
  }

  private toDomain(row: { id: string; title: string; description: string | null; schema: unknown; status: string; createdById: string | null; createdAt: Date; updatedAt: Date }): Form {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      schema: row.schema,
      status: row.status as Form['status'],
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
