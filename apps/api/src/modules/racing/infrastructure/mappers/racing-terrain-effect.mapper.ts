import { RacingTerrainEffect as PrismaRacingTerrainEffect } from '../../../../generated/prisma/client';
import { RacingTerrainEffect } from '../../domain/entities/racing-terrain-effect.entity';
import { TerrainType } from '../../domain/track-terrain';

export function toRacingTerrainEffectDomain(
  row: PrismaRacingTerrainEffect,
): RacingTerrainEffect {
  return new RacingTerrainEffect(
    row.id,
    TerrainType[row.type],
    row.grip,
    row.slowsTopSpeed,
  );
}
