import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import {
  RacingMatchmakingConfigRepositoryPort,
  RacingMatchmakingConfigValues,
} from '../../application/ports/racing-matchmaking-config-repository.port';
import {
  RacingMatchmakingConfig,
  RacingMatchmakingConfigKey,
} from '../../domain/entities/racing-matchmaking-config.entity';
import { toRacingMatchmakingConfigDomain } from '../mappers/racing-matchmaking-config.mapper';

@Injectable()
export class PrismaRacingMatchmakingConfigRepository
  implements RacingMatchmakingConfigRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RacingMatchmakingConfig[]> {
    const rows = await this.prisma.racingMatchmakingConfig.findMany({
      orderBy: { key: 'asc' },
    });
    return rows.map(toRacingMatchmakingConfigDomain);
  }

  async findByKey(key: RacingMatchmakingConfigKey): Promise<RacingMatchmakingConfig | null> {
    const row = await this.prisma.racingMatchmakingConfig.findUnique({
      where: { key },
    });
    return row === null ? null : toRacingMatchmakingConfigDomain(row);
  }

  async update(
    key: RacingMatchmakingConfigKey,
    value: number,
  ): Promise<RacingMatchmakingConfig> {
    const row = await this.prisma.racingMatchmakingConfig.update({
      where: { key },
      data: { value },
    });
    return toRacingMatchmakingConfigDomain(row);
  }

  async getValues(): Promise<RacingMatchmakingConfigValues> {
    const rows = await this.findAll();
    return new Map(rows.map((row) => [row.key, row.value]));
  }
}
