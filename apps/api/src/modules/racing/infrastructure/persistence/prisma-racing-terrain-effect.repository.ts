import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  RacingTerrainEffectRepositoryPort,
  UpdateRacingTerrainEffectPatch,
} from '../../application/ports/racing-terrain-effect-repository.port';
import { RacingTerrainEffect } from '../../domain/entities/racing-terrain-effect.entity';
import { TerrainType } from '../../domain/track-terrain';
import { toRacingTerrainEffectDomain } from '../mappers/racing-terrain-effect.mapper';

@Injectable()
export class PrismaRacingTerrainEffectRepository implements RacingTerrainEffectRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RacingTerrainEffect[]> {
    const rows = await this.prisma.racingTerrainEffect.findMany({
      orderBy: { type: 'asc' },
    });
    return rows.map(toRacingTerrainEffectDomain);
  }

  async findByType(type: TerrainType): Promise<RacingTerrainEffect | null> {
    const row = await this.prisma.racingTerrainEffect.findUnique({
      where: { type },
    });
    return row === null ? null : toRacingTerrainEffectDomain(row);
  }

  async update(
    type: TerrainType,
    patch: UpdateRacingTerrainEffectPatch,
  ): Promise<RacingTerrainEffect> {
    const row = await this.prisma.racingTerrainEffect.update({
      where: { type },
      data: patch,
    });
    return toRacingTerrainEffectDomain(row);
  }
}
