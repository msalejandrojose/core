import { RacingCoinRewardConfig as PrismaRacingCoinRewardConfig } from '../../../../generated/prisma/client';
import {
  RacingCoinRewardConfig,
  RacingCoinRewardKey,
} from '../../domain/entities/racing-coin-reward-config.entity';

export function toRacingCoinRewardConfigDomain(
  row: PrismaRacingCoinRewardConfig,
): RacingCoinRewardConfig {
  return new RacingCoinRewardConfig(
    RacingCoinRewardKey[row.key],
    row.amount,
  );
}
