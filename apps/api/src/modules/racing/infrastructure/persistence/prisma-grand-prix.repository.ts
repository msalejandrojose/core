import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import {
  AdminListGrandPrixOptions,
  CreateGrandPrixData,
  GrandPrixRepositoryPort,
  UpdateGrandPrixPatch,
} from '../../application/ports/grand-prix-repository.port';
import { GrandPrix } from '../../domain/entities/grand-prix.entity';
import { toGrandPrixDomain } from '../mappers/grand-prix.mapper';

const WITH_STAGES = {
  stages: {
    orderBy: { order: 'asc' as const },
    include: { track: { select: { id: true, slug: true, name: true } } },
  },
};

@Injectable()
export class PrismaGrandPrixRepository implements GrandPrixRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<GrandPrix | null> {
    const row = await this.prisma.racingGrandPrix.findUnique({
      where: { id },
      include: WITH_STAGES,
    });
    return row === null ? null : toGrandPrixDomain(row);
  }

  async findBySlug(slug: string): Promise<GrandPrix | null> {
    const row = await this.prisma.racingGrandPrix.findUnique({
      where: { slug },
      include: WITH_STAGES,
    });
    return row === null ? null : toGrandPrixDomain(row);
  }

  async existsSlug(slug: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.racingGrandPrix.count({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    return count > 0;
  }

  async findActive(): Promise<GrandPrix[]> {
    const rows = await this.prisma.racingGrandPrix.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      include: WITH_STAGES,
    });
    return rows.map(toGrandPrixDomain);
  }

  async listAdmin(
    opts: AdminListGrandPrixOptions,
  ): Promise<PaginatedResult<GrandPrix>> {
    const where: Prisma.RacingGrandPrixWhereInput = opts.search
      ? {
          OR: [
            { slug: { contains: opts.search } },
            { name: { contains: opts.search } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.racingGrandPrix.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: opts.limit,
        skip: (opts.page - 1) * opts.limit,
        include: WITH_STAGES,
      }),
      this.prisma.racingGrandPrix.count({ where }),
    ]);

    return { items: rows.map(toGrandPrixDomain), total };
  }

  async create(data: CreateGrandPrixData): Promise<GrandPrix> {
    const row = await this.prisma.racingGrandPrix.create({
      data: {
        slug: data.slug,
        name: data.name,
        isActive: data.isActive,
        stages: {
          create: data.stages.map((s) => ({
            trackId: s.trackId,
            order: s.order,
          })),
        },
      },
      include: WITH_STAGES,
    });
    return toGrandPrixDomain(row);
  }

  // Si vienen `stages`, se sustituye la lista entera (borrar + crear) en vez
  // de intentar diffear altas/bajas/reordenaciones — es una pantalla de
  // administración, no hace falta preservar ids de fila de las mangas.
  async update(id: string, patch: UpdateGrandPrixPatch): Promise<GrandPrix> {
    const row = await this.prisma.$transaction(async (tx) => {
      if (patch.stages) {
        await tx.racingGrandPrixStage.deleteMany({
          where: { grandPrixId: id },
        });
      }

      return tx.racingGrandPrix.update({
        where: { id },
        data: {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
          ...(patch.stages
            ? {
                stages: {
                  create: patch.stages.map((s) => ({
                    trackId: s.trackId,
                    order: s.order,
                  })),
                },
              }
            : {}),
        },
        include: WITH_STAGES,
      });
    });

    return toGrandPrixDomain(row);
  }
}
