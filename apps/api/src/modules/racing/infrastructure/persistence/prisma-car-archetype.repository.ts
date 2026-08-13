import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import {
  AdminListCarArchetypesOptions,
  CarArchetypeRepositoryPort,
  CreateCarArchetypeData,
  UpdateCarArchetypePatch,
} from '../../application/ports/car-archetype-repository.port';
import { CarArchetype } from '../../domain/entities/car-archetype.entity';
import { toCarArchetypeDomain } from '../mappers/car-archetype.mapper';

@Injectable()
export class PrismaCarArchetypeRepository implements CarArchetypeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CarArchetype | null> {
    const row = await this.prisma.carArchetype.findUnique({ where: { id } });
    return row === null ? null : toCarArchetypeDomain(row);
  }

  async existsCode(code: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.carArchetype.count({
      where: { code, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    return count > 0;
  }

  async listActive(): Promise<CarArchetype[]> {
    const rows = await this.prisma.carArchetype.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toCarArchetypeDomain);
  }

  async listAll(
    opts: AdminListCarArchetypesOptions,
  ): Promise<PaginatedResult<CarArchetype>> {
    const where: Prisma.CarArchetypeWhereInput = opts.search
      ? {
          OR: [
            { code: { contains: opts.search } },
            { name: { contains: opts.search } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.carArchetype.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: opts.limit,
        skip: (opts.page - 1) * opts.limit,
      }),
      this.prisma.carArchetype.count({ where }),
    ]);

    return { items: rows.map(toCarArchetypeDomain), total };
  }

  async create(data: CreateCarArchetypeData): Promise<CarArchetype> {
    const row = await this.prisma.carArchetype.create({ data });
    return toCarArchetypeDomain(row);
  }

  async update(
    id: string,
    patch: UpdateCarArchetypePatch,
  ): Promise<CarArchetype> {
    const row = await this.prisma.carArchetype.update({
      where: { id },
      data: patch,
    });
    return toCarArchetypeDomain(row);
  }
}
