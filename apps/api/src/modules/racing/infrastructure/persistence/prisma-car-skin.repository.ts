import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import {
  AdminListCarSkinsOptions,
  CarSkinRepositoryPort,
  CreateCarSkinData,
  UpdateCarSkinPatch,
} from '../../application/ports/car-skin-repository.port';
import { CarSkin } from '../../domain/entities/car-skin.entity';
import { toCarSkinDomain } from '../mappers/car-skin.mapper';

@Injectable()
export class PrismaCarSkinRepository implements CarSkinRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<CarSkin | null> {
    const row = await this.prisma.carSkin.findUnique({ where: { id } });
    return row === null ? null : toCarSkinDomain(row);
  }

  async existsCode(code: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.carSkin.count({
      where: { code, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    return count > 0;
  }

  async listActive(): Promise<CarSkin[]> {
    const rows = await this.prisma.carSkin.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toCarSkinDomain);
  }

  async listAll(
    opts: AdminListCarSkinsOptions,
  ): Promise<PaginatedResult<CarSkin>> {
    const where: Prisma.CarSkinWhereInput = {
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
      this.prisma.carSkin.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: opts.limit,
        skip: (opts.page - 1) * opts.limit,
      }),
      this.prisma.carSkin.count({ where }),
    ]);

    return { items: rows.map(toCarSkinDomain), total };
  }

  async create(data: CreateCarSkinData): Promise<CarSkin> {
    const row = await this.prisma.carSkin.create({ data });
    return toCarSkinDomain(row);
  }

  async update(id: string, patch: UpdateCarSkinPatch): Promise<CarSkin> {
    const row = await this.prisma.carSkin.update({
      where: { id },
      data: patch,
    });
    return toCarSkinDomain(row);
  }
}
