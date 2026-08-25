import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import {
  AdminListCircuitsOptions,
  RacingCircuitRepositoryPort,
  UpdateCircuitPatch,
} from '../../application/ports/racing-circuit-repository.port';
import { RacingCircuit } from '../../domain/entities/racing-circuit.entity';
import { toRacingCircuitDomain } from '../mappers/racing-circuit.mapper';

@Injectable()
export class PrismaRacingCircuitRepository implements RacingCircuitRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<RacingCircuit | null> {
    const row = await this.prisma.racingCircuit.findUnique({ where: { id } });
    return row === null ? null : toRacingCircuitDomain(row);
  }

  async findBySlug(slug: string): Promise<RacingCircuit | null> {
    const row = await this.prisma.racingCircuit.findUnique({ where: { slug } });
    return row === null ? null : toRacingCircuitDomain(row);
  }

  async listAll(opts: AdminListCircuitsOptions): Promise<PaginatedResult<RacingCircuit>> {
    const where: Prisma.RacingCircuitWhereInput = opts.search
      ? {
          OR: [
            { slug: { contains: opts.search } },
            { name: { contains: opts.search } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.racingCircuit.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: opts.limit,
        skip: (opts.page - 1) * opts.limit,
      }),
      this.prisma.racingCircuit.count({ where }),
    ]);

    return { items: rows.map(toRacingCircuitDomain), total };
  }

  async update(id: string, patch: UpdateCircuitPatch): Promise<RacingCircuit> {
    const data: Prisma.RacingCircuitUncheckedUpdateInput = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.checkpoints !== undefined) data.checkpoints = patch.checkpoints;
    if (patch.path !== undefined) {
      data.path = patch.path as unknown as Prisma.InputJsonValue;
    }
    if (patch.theme !== undefined) data.theme = patch.theme;
    if (patch.grip !== undefined) data.grip = patch.grip;
    if (patch.isActive !== undefined) data.isActive = patch.isActive;
    if (patch.imageId !== undefined) data.imageId = patch.imageId;

    const row = await this.prisma.racingCircuit.update({ where: { id }, data });
    return toRacingCircuitDomain(row);
  }

  async findActiveCandidateIds(): Promise<string[]> {
    const rows = await this.prisma.racingCircuit.findMany({
      where: { isActive: true },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  async findLastRotatedAt(): Promise<Date | null> {
    const result = await this.prisma.racingCircuit.aggregate({
      _max: { rotatedAt: true },
    });
    return result._max.rotatedAt;
  }

  async applyRotation(selectedIds: readonly string[], rotatedAt: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.racingCircuit.updateMany({
        where: { id: { in: [...selectedIds] } },
        data: { isInRotation: true, rotatedAt },
      }),
      this.prisma.racingCircuit.updateMany({
        where: { id: { notIn: [...selectedIds] } },
        data: { isInRotation: false },
      }),
    ]);
  }
}
