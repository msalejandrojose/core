import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Country } from '../../domain/entities/country.entity';
import {
  CountryRepositoryPort,
  CreateCountryData,
  ListCountriesOptions,
  UpdateCountryPatch,
} from '../../application/ports/country-repository.port';
import { CountryMapper } from '../mappers/country.mapper';

@Injectable()
export class PrismaCountryRepository implements CountryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCountryData): Promise<Country> {
    const row = await this.prisma.country.create({ data });
    return CountryMapper.toDomain(row);
  }

  async update(id: string, patch: UpdateCountryPatch): Promise<Country> {
    const data: Prisma.CountryUncheckedUpdateInput = {};
    if (patch.iso2 !== undefined) data.iso2 = patch.iso2;
    if (patch.iso3 !== undefined) data.iso3 = patch.iso3;
    if (patch.numericCode !== undefined) data.numericCode = patch.numericCode;
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.nativeName !== undefined) data.nativeName = patch.nativeName;
    if (patch.phoneCode !== undefined) data.phoneCode = patch.phoneCode;
    if (patch.isActive !== undefined) data.isActive = patch.isActive;
    const row = await this.prisma.country.update({ where: { id }, data });
    return CountryMapper.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.country.delete({ where: { id } });
  }

  async findById(id: string): Promise<Country | null> {
    const row = await this.prisma.country.findUnique({ where: { id } });
    return row ? CountryMapper.toDomain(row) : null;
  }

  async existsIso(
    iso2: string,
    iso3: string,
    exceptId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.country.count({
      where: {
        OR: [{ iso2 }, { iso3 }],
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });
    return count > 0;
  }

  async list(opts: ListCountriesOptions): Promise<PaginatedResult<Country>> {
    const where: Prisma.CountryWhereInput = {
      ...(opts.search
        ? {
            OR: [
              { name: { contains: opts.search } },
              { iso2: { contains: opts.search } },
              { iso3: { contains: opts.search } },
            ],
          }
        : {}),
      ...(opts.isActive !== undefined ? { isActive: opts.isActive } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.country.findMany({
        where,
        orderBy: { name: 'asc' },
        take: opts.limit,
        skip: (opts.page - 1) * opts.limit,
      }),
      this.prisma.country.count({ where }),
    ]);
    return { items: rows.map((r) => CountryMapper.toDomain(r)), total };
  }
}
