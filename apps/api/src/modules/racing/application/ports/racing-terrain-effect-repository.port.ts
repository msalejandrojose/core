import { RacingTerrainEffect } from '../../domain/entities/racing-terrain-effect.entity';
import { TerrainType } from '../../domain/track-terrain';

export const RACING_TERRAIN_EFFECT_REPOSITORY = Symbol(
  'RACING_TERRAIN_EFFECT_REPOSITORY',
);

export interface UpdateRacingTerrainEffectPatch {
  grip?: number;
  slowsTopSpeed?: boolean;
}

// Sin create/delete: los cuatro tipos son un conjunto cerrado (ver el
// comentario del modelo en schema.prisma) — solo se listan y se ajustan sus
// factores.
export interface RacingTerrainEffectRepositoryPort {
  findAll(): Promise<RacingTerrainEffect[]>;
  findByType(type: TerrainType): Promise<RacingTerrainEffect | null>;
  update(
    type: TerrainType,
    patch: UpdateRacingTerrainEffectPatch,
  ): Promise<RacingTerrainEffect>;
}
