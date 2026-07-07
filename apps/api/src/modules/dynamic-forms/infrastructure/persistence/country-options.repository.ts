import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  type FieldOption,
  type FieldOptionsQuery,
  type FieldOptionsRepository,
  type FieldOptionsResult,
} from '../../application/ports/field-options-repository.port';

/** Opciones desde `Country`: value = iso2, label = name (solo activos). */
@Injectable()
export class CountryOptionsRepository implements FieldOptionsRepository {
  readonly entity = 'Country';

  constructor(private readonly prisma: PrismaService) {}

  async list(query?: FieldOptionsQuery): Promise<FieldOptionsResult> {
    const page = query?.page && query.page > 0 ? query.page : 1;
    const pageSize = clampPageSize(query?.pageSize);
    const where = {
      isActive: true,
      ...(query?.search
        ? {
            OR: [
              { name: { contains: query.search } },
              { iso2: { contains: query.search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.country.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { iso2: true, name: true },
      }),
      this.prisma.country.count({ where }),
    ]);

    return {
      options: rows.map((c) => ({ value: c.iso2, label: c.name })),
      total,
    };
  }

  async getByValue(value: string): Promise<FieldOption | null> {
    const c = await this.prisma.country.findUnique({
      where: { iso2: value.toUpperCase() },
      select: { iso2: true, name: true },
    });
    return c ? { value: c.iso2, label: c.name } : null;
  }
}

function clampPageSize(value: number | undefined): number {
  if (!value || value < 1) return 20;
  return Math.min(value, 100);
}
