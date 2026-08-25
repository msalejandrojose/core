import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import {
  AdminListCarPartsOptions,
  CarPartRepositoryPort,
  CreateCarPartData,
  UpdateCarPartPatch,
} from '../../application/ports/car-part-repository.port';
import { CarPart } from '../../domain/entities/car-part.entity';
import { toCarPartDomain } from '../mappers/car-part.mapper';

@Injectable()
export class PrismaCarPartRepository implements CarPartRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CarPart | null> {
    const row = await this.prisma.carPart.findUnique({ where: { id } });
    return row === null ? null : toCarPartDomain(row);
  }

  async existsCode(code: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.carPart.count({
      where: { code, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    return count > 0;
  }

  async listActive(): Promise<CarPart[]> {
    const rows = await this.prisma.carPart.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toCarPartDomain);
  }

  async listAll(
    opts: AdminListCarPartsOptions,
  ): Promise<PaginatedResult<CarPart>> {
    const where: Prisma.CarPartWhereInput = {
      ...(opts.category ? { category: opts.category } : {}),
      ...(opts.search
        ? {
            OR: [
              { code: { contains: opts.search } },
              { name: { contains: opts.search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.carPart.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: opts.limit,
        skip: (opts.page - 1) * opts.limit,
      }),
      this.prisma.carPart.count({ where }),
    ]);

    return { items: rows.map(toCarPartDomain), total };
  }

  async create(data: CreateCarPartData): Promise<CarPart> {
    const row = await this.prisma.carPart.create({ data });
    return toCarPartDomain(row);
  }

  async update(id: string, patch: UpdateCarPartPatch): Promise<CarPart> {
    const row = await this.prisma.carPart.update({
      where: { id },
      data: patch,
    });
    return toCarPartDomain(row);
  }
}
