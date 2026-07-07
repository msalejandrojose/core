import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { PostalCode } from '../../domain/entities/postal-code.entity';
import {
  CreatePostalCodeData,
  ListPostalCodesOptions,
  PostalCodeRepositoryPort,
  UpdatePostalCodePatch,
} from '../../application/ports/postal-code-repository.port';
import { PostalCodeMapper } from '../mappers/postal-code.mapper';

@Injectable()
export class PrismaPostalCodeRepository implements PostalCodeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePostalCodeData): Promise<PostalCode> {
    const row = await this.prisma.postalCode.create({ data });
    return PostalCodeMapper.toDomain(row);
  }

  async update(id: string, patch: UpdatePostalCodePatch): Promise<PostalCode> {
    const data: Prisma.PostalCodeUncheckedUpdateInput = {};
    if (patch.code !== undefined) data.code = patch.code;
    if (patch.municipalityId !== undefined)
      data.municipalityId = patch.municipalityId;
    const row = await this.prisma.postalCode.update({ where: { id }, data });
    return PostalCodeMapper.toDomain(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.postalCode.delete({ where: { id } });
  }

  async findById(id: string): Promise<PostalCode | null> {
    const row = await this.prisma.postalCode.findUnique({ where: { id } });
    return row ? PostalCodeMapper.toDomain(row) : null;
  }

  async existsCode(
    municipalityId: string,
    code: string,
    exceptId?: string,
  ): Promise<boolean> {
    const count = await this.prisma.postalCode.count({
      where: {
        municipalityId,
        code,
        ...(exceptId ? { id: { not: exceptId } } : {}),
      },
    });
    return count > 0;
  }

  async list(
    opts: ListPostalCodesOptions,
  ): Promise<PaginatedResult<PostalCode>> {
    const where: Prisma.PostalCodeWhereInput = {
      ...(opts.search ? { code: { contains: opts.search } } : {}),
      ...(opts.municipalityId ? { municipalityId: opts.municipalityId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.postalCode.findMany({
        where,
        orderBy: { code: 'asc' },
        take: opts.limit,
        skip: (opts.page - 1) * opts.limit,
      }),
      this.prisma.postalCode.count({ where }),
    ]);
    return { items: rows.map((r) => PostalCodeMapper.toDomain(r)), total };
  }
}
