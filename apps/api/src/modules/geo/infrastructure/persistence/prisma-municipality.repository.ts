import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Municipality } from '../../domain/entities/municipality.entity';
import {
  CreateMunicipalityData,
  ListMunicipalitiesOptions,
  MunicipalityRepositoryPort,
  UpdateMunicipalityPatch,
} from '../../application/ports/municipality-repository.port';
import { MunicipalityMapper } from '../mappers/municipality.mapper';

@Injectable()
export class PrismaMunicipalityRepository implements MunicipalityRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateMunicipalityData): Promise<Municipality> {
    const row = await this.prisma.municipality.create({ data });
    return MunicipalityMapper.toDomain(row);
  }

  async update(
    id: string,
    patch: UpdateMunicipalityPatch,
  ): Promise<Municipality> {
    const data: Prisma.MunicipalityUncheckedUpdateInput = {};
    if (patch.code !== undefined) data.code = patch.code;
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.provinceId !== undefined) data.provinceId = patch.provinceId;
    const row = await this.prisma.municipality.update({ where: { id }, data });
    return MunicipalityMapper.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.municipality.delete({ where: { id } });
  }

  async findById(id: string): Promise<Municipality | null> {
    const row = await this.prisma.municipality.findUnique({ where: { id } });
    return row ? MunicipalityMapper.toDomain(row) : null;
  }

  async existsCode(
    provinceId: string,
    code: string,
    exceptId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.municipality.count({
      where: {
        provinceId,
        code,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });
    return count > 0;
  }

  async list(
    opts: ListMunicipalitiesOptions,
  ): Promise<PaginatedResult<Municipality>> {
    const where: Prisma.MunicipalityWhereInput = {
      ...(opts.search
        ? {
            OR: [
              { name: { contains: opts.search } },
              { code: { contains: opts.search } },
            ],
          }
        : {}),
      ...(opts.provinceId ? { provinceId: opts.provinceId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.municipality.findMany({
        where,
        orderBy: { name: 'asc' },
        take: opts.limit,
        skip: (opts.page - 1) * opts.limit,
      }),
      this.prisma.municipality.count({ where }),
    ]);
    return { items: rows.map((r) => MunicipalityMapper.toDomain(r)), total };
  }
}
