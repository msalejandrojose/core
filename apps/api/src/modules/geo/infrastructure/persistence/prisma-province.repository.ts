import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Province } from '../../domain/entities/province.entity';
import {
  CreateProvinceData,
  ListProvincesOptions,
  ProvinceRepositoryPort,
  UpdateProvincePatch,
} from '../../application/ports/province-repository.port';
import { ProvinceMapper } from '../mappers/province.mapper';

@Injectable()
export class PrismaProvinceRepository implements ProvinceRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateProvinceData): Promise<Province> {
    const row = await this.prisma.province.create({ data });
    return ProvinceMapper.toDomain(row);
  }

  async update(id: string, patch: UpdateProvincePatch): Promise<Province> {
    const data: Prisma.ProvinceUncheckedUpdateInput = {};
    if (patch.code !== undefined) data.code = patch.code;
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.countryId !== undefined) data.countryId = patch.countryId;
    if (patch.regionId !== undefined) data.regionId = patch.regionId;
    const row = await this.prisma.province.update({ where: { id }, data });
    return ProvinceMapper.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.province.delete({ where: { id } });
  }

  async findById(id: string): Promise<Province | null> {
    const row = await this.prisma.province.findUnique({ where: { id } });
    return row ? ProvinceMapper.toDomain(row) : null;
  }

  async existsCode(
    countryId: string,
    code: string,
    exceptId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.province.count({
      where: {
        countryId,
        code,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });
    return count > 0;
  }

  async list(opts: ListProvincesOptions): Promise<PaginatedResult<Province>> {
    const where: Prisma.ProvinceWhereInput = {
      ...(opts.search
        ? {
            OR: [
              { name: { contains: opts.search } },
              { code: { contains: opts.search } },
            ],
          }
        : {}),
      ...(opts.countryId ? { countryId: opts.countryId } : {}),
      ...(opts.regionId ? { regionId: opts.regionId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.province.findMany({
        where,
        orderBy: { name: 'asc' },
        take: opts.limit,
        skip: (opts.page - 1) * opts.limit,
      }),
      this.prisma.province.count({ where }),
    ]);
    return { items: rows.map((r) => ProvinceMapper.toDomain(r)), total };
  }
}
