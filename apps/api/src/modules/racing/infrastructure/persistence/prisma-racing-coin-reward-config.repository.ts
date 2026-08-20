import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { RacingCoinRewardConfigRepositoryPort } from '../../application/ports/racing-coin-reward-config-repository.port';
import {
  RacingCoinRewardConfig,
  RacingCoinRewardKey,
} from '../../domain/entities/racing-coin-reward-config.entity';
import { RacingCoinRewardAmounts } from '../../domain/racing-coin-rewards';
import { toRacingCoinRewardConfigDomain } from '../mappers/racing-coin-reward-config.mapper';

@Injectable()
export class PrismaRacingCoinRewardConfigRepository
  implements RacingCoinRewardConfigRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RacingCoinRewardConfig[]> {
    const rows = await this.prisma.racingCoinRewardConfig.findMany({
      orderBy: { key: 'asc' },
    });
    return rows.map(toRacingCoinRewardConfigDomain);
  }

  async findByKey(key: RacingCoinRewardKey): Promise<RacingCoinRewardConfig | null> {
    const row = await this.prisma.racingCoinRewardConfig.findUnique({
      where: { key },
    });
    return row === null ? null : toRacingCoinRewardConfigDomain(row);
  }

  async update(key: RacingCoinRewardKey, amount: number): Promise<RacingCoinRewardConfig> {
    const row = await this.prisma.racingCoinRewardConfig.update({
      where: { key },
      data: { amount },
    });
    return toRacingCoinRewardConfigDomain(row);
  }

  async getAmounts(): Promise<RacingCoinRewardAmounts> {
    const rows = await this.findAll();
    return new Map(rows.map((row) => [row.key, row.amount]));
  }
}
