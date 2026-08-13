import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  PlayerCarLoadoutRepositoryPort,
  UpsertPlayerCarLoadoutData,
} from '../../application/ports/player-car-loadout-repository.port';
import { PlayerCarLoadout } from '../../domain/entities/player-car-loadout.entity';
import { toPlayerCarLoadoutDomain } from '../mappers/player-car-loadout.mapper';

@Injectable()
export class PrismaPlayerCarLoadoutRepository implements PlayerCarLoadoutRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: string): Promise<PlayerCarLoadout | null> {
    const row = await this.prisma.playerCarLoadout.findUnique({
      where: { userId },
    });
    return row === null ? null : toPlayerCarLoadoutDomain(row);
  }

  async upsert(
    userId: string,
    data: UpsertPlayerCarLoadoutData,
  ): Promise<PlayerCarLoadout> {
    const row = await this.prisma.playerCarLoadout.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    return toPlayerCarLoadoutDomain(row);
  }
}
