import { RacingLeagueConfig as PrismaRacingLeagueConfig } from '../../../../generated/prisma/client';
import {
  RacingLeagueConfig,
  RacingLeagueConfigKey,
} from '../../domain/entities/racing-league-config.entity';

export function toRacingLeagueConfigDomain(
  row: PrismaRacingLeagueConfig,
): RacingLeagueConfig {
  return new RacingLeagueConfig(RacingLeagueConfigKey[row.key], row.value);
}
