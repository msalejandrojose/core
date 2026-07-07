import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Region } from '../../domain/entities/region.entity';
import {
  CreateRegionData,
  ListRegionsOptions,
  RegionRepositoryPort,
  UpdateRegionPatch,
} from '../../application/ports/region-repository.port';
import { RegionMapper } from '../mappers/region.mapper';

@Injectable()
export class PrismaRegionRepository implements RegionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateRegionData): Promise<Region> {
    const row = await this.prisma.region.create({ data });
    return RegionMapper.toDomain(row);
  }

  async update(id: string, patch: UpdateRegionPatch): Promise<Region> {
    const data: Prisma.RegionUncheckedUpdateInput = {};
    if (patch.code !== undefined) data.code = patch.code;
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.countryId !== undefined) data.countryId = patch.countryId;
    const row = await this.prisma.region.update({ where: { id }, data });
    return RegionMapper.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.region.delete({ where: { id } });
  }

  async findById(id: string): Promise<Region | null> {
    const row = await this.prisma.region.findUnique({ where: { id } });
    return row ? RegionMapper.toDomain(row) : null;
  }

  async existsCode(
    countryId: string,
    code: string,
    exceptId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.region.count({
      where: {
        countryId,
        code,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });
    return count > 0;
  }

  async list(opts: ListRegionsOptions): Promise<PaginatedResult<Region>> {
    const where: Prisma.RegionWhereInput = {
      ...(opts.search
        ? {
            OR: [
              { name: { contains: opts.search } },
              { code: { contains: opts.search } },
            ],
          }
        : {}),
      ...(opts.countryId ? { countryId: opts.countryId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.region.findMany({
        where,
        orderBy: { name: 'asc' },
        take: opts.limit,
        skip: (opts.page - 1) * opts.limit,
      }),
      this.prisma.region.count({ where }),
    ]);
    return { items: rows.map((r) => RegionMapper.toDomain(r)), total };
  }
}
