import { RacingMatchmakingConfig as PrismaRacingMatchmakingConfig } from '../../../../generated/prisma/client';
import {
  RacingMatchmakingConfig,
  RacingMatchmakingConfigKey,
} from '../../domain/entities/racing-matchmaking-config.entity';

export function toRacingMatchmakingConfigDomain(
  row: PrismaRacingMatchmakingConfig,
): RacingMatchmakingConfig {
  return new RacingMatchmakingConfig(
    RacingMatchmakingConfigKey[row.key],
    row.value,
  );
}
