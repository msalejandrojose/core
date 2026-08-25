import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { RacingLeagueConfigRepositoryPort } from '../../application/ports/racing-league-config-repository.port';
import {
  RacingLeagueConfig,
  RacingLeagueConfigKey,
} from '../../domain/entities/racing-league-config.entity';
import { RacingLeaguePointsAmounts } from '../../domain/racing-league-points';
import { toRacingLeagueConfigDomain } from '../mappers/racing-league-config.mapper';

@Injectable()
export class PrismaRacingLeagueConfigRepository
  implements RacingLeagueConfigRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RacingLeagueConfig[]> {
    const rows = await this.prisma.racingLeagueConfig.findMany({
      orderBy: { key: 'asc' },
    });
    return rows.map(toRacingLeagueConfigDomain);
  }

  async findByKey(key: RacingLeagueConfigKey): Promise<RacingLeagueConfig | null> {
    const row = await this.prisma.racingLeagueConfig.findUnique({
      where: { key },
    });
    return row === null ? null : toRacingLeagueConfigDomain(row);
  }

  async update(key: RacingLeagueConfigKey, value: number): Promise<RacingLeagueConfig> {
    const row = await this.prisma.racingLeagueConfig.update({
      where: { key },
      data: { value },
    });
    return toRacingLeagueConfigDomain(row);
  }

  async getAmounts(): Promise<RacingLeaguePointsAmounts> {
    const rows = await this.findAll();
    return new Map(rows.map((row) => [row.key, row.value]));
  }
}
