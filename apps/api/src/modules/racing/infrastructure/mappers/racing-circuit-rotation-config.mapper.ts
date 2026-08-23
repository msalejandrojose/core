import { RacingCircuitRotationConfig as PrismaRacingCircuitRotationConfig } from '../../../../generated/prisma/client';
import {
  RacingCircuitRotationConfig,
  RacingCircuitRotationConfigKey,
} from '../../domain/entities/racing-circuit-rotation-config.entity';

export function toRacingCircuitRotationConfigDomain(
  row: PrismaRacingCircuitRotationConfig,
): RacingCircuitRotationConfig {
  return new RacingCircuitRotationConfig(
    RacingCircuitRotationConfigKey[row.key],
    row.value,
  );
}
