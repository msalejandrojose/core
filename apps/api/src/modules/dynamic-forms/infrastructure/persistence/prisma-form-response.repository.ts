import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { CursorCodec, CursorPage } from '../../../../shared/pagination';
import { FormResponse } from '../../domain/entities/form-response.entity';
import {
  CreateFormResponseData,
  FormResponseRepositoryPort,
  ListFormResponsesOptions,
} from '../../application/ports/form-response-repository.port';

@Injectable()
export class PrismaFormResponseRepository implements FormResponseRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateFormResponseData): Promise<FormResponse> {
    const row = await this.prisma.formResponse.create({
      data: {
        formInstanceId: data.formInstanceId,
        submittedById: data.submittedById,
        submittedByFingerprint: data.submittedByFingerprint,
        answers: data.answers as Prisma.InputJsonValue,
        schemaSnapshot: data.schemaSnapshot as Prisma.InputJsonValue,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
    return this.toDomain(row);
  }

  async findById(id: string): Promise<FormResponse | null> {
    const row = await this.prisma.formResponse.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async list(opts: ListFormResponsesOptions): Promise<CursorPage<FormResponse>> {
    const where: Prisma.FormResponseWhereInput = opts.cursor
      ? {
          AND: [
            { formInstanceId: opts.formInstanceId },
            this.cursorWhere(opts.cursor),
          ],
        }
      : { formInstanceId: opts.formInstanceId };

    const rows = await this.prisma.formResponse.findMany({
      where,
      orderBy: [{ submittedAt: 'desc' }, { id: 'asc' }],
      take: opts.limit + 1,
    });

    const hasMore = rows.length > opts.limit;
    const slice = hasMore ? rows.slice(0, opts.limit) : rows;
    const last = hasMore ? slice[slice.length - 1] : null;
    return {
      items: slice.map((r) => this.toDomain(r)),
      nextCursor: last
        ? CursorCodec.encode({ id: last.id, createdAt: last.submittedAt.toISOString() })
        : null,
    };
  }

  async existsByUserId(instanceId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.formResponse.count({
      where: { formInstanceId: instanceId, submittedById: userId },
    });
    return count > 0;
  }

  async existsByFingerprint(instanceId: string, fingerprint: string): Promise<boolean> {
    const count = await this.prisma.formResponse.count({
      where: { formInstanceId: instanceId, submittedByFingerprint: fingerprint },
    });
    return count > 0;
  }

  async existsByInstance(instanceId: string): Promise<boolean> {
    const count = await this.prisma.formResponse.count({
      where: { formInstanceId: instanceId },
    });
    return count > 0;
  }

  private cursorWhere(cursor: string): Prisma.FormResponseWhereInput {
    const decoded = CursorCodec.decode(cursor);
    const date = new Date(decoded.createdAt);
    return {
      OR: [
        { submittedAt: { lt: date } },
        { submittedAt: date, id: { gt: decoded.id } },
      ],
    };
  }

  private toDomain(row: {
    id: string; formInstanceId: string; submittedById: string | null;
    submittedByFingerprint: string | null; answers: unknown; schemaSnapshot: unknown;
    submittedAt: Date; ipAddress: string | null; userAgent: string | null;
  }): FormResponse {
    return {
      id: row.id,
      formInstanceId: row.formInstanceId,
      submittedById: row.submittedById,
      submittedByFingerprint: row.submittedByFingerprint,
      answers: row.answers,
      schemaSnapshot: row.schemaSnapshot,
      submittedAt: row.submittedAt,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
    };
  }
}
