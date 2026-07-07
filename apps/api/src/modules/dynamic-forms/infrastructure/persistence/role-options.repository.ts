import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  type FieldOption,
  type FieldOptionsQuery,
  type FieldOptionsRepository,
  type FieldOptionsResult,
} from '../../application/ports/field-options-repository.port';

/** Opciones desde `UserRole`: value = id, label = name, parent = parentRoleId. */
@Injectable()
export class RoleOptionsRepository implements FieldOptionsRepository {
  readonly entity = 'Role';

  constructor(private readonly prisma: PrismaService) {}

  async list(query?: FieldOptionsQuery): Promise<FieldOptionsResult> {
    const page = query?.page && query.page > 0 ? query.page : 1;
    const pageSize = clampPageSize(query?.pageSize);
    const where = query?.search
      ? {
          OR: [
            { name: { contains: query.search } },
            { code: { contains: query.search } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.userRole.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, name: true, parentRoleId: true },
      }),
      this.prisma.userRole.count({ where }),
    ]);

    return {
      options: rows.map((r) => ({
        value: r.id,
        label: r.name,
        parentValue: r.parentRoleId,
      })),
      total,
    };
  }

  async getByValue(value: string): Promise<FieldOption | null> {
    const r = await this.prisma.userRole.findUnique({
      where: { id: value },
      select: { id: true, name: true, parentRoleId: true },
    });
    return r
      ? { value: r.id, label: r.name, parentValue: r.parentRoleId }
      : null;
  }
}

function clampPageSize(value: number | undefined): number {
  if (!value || value < 1) return 20;
  return Math.min(value, 100);
}
