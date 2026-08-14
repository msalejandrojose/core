import { Inject, Injectable } from '@nestjs/common';
import { RacingTerrainEffect } from '../../domain/entities/racing-terrain-effect.entity';
import { RacingTerrainEffectNotFoundError } from '../../domain/errors/racing-terrain-effect-not-found.error';
import { TerrainType } from '../../domain/track-terrain';
import {
  RACING_TERRAIN_EFFECT_REPOSITORY,
  type RacingTerrainEffectRepositoryPort,
} from '../ports/racing-terrain-effect-repository.port';

export interface UpdateTerrainEffectInput {
  grip?: number;
  slowsTopSpeed?: boolean;
}

@Injectable()
export class AdminUpdateTerrainEffectUseCase {
  constructor(
    @Inject(RACING_TERRAIN_EFFECT_REPOSITORY)
    private readonly effects: RacingTerrainEffectRepositoryPort,
  ) {}

  async execute(
    type: TerrainType,
    input: UpdateTerrainEffectInput,
  ): Promise<RacingTerrainEffect> {
    const existing = await this.effects.findByType(type);
    if (!existing) throw new RacingTerrainEffectNotFoundError(type);

    return this.effects.update(type, {
      grip: input.grip,
      slowsTopSpeed: input.slowsTopSpeed,
    });
  }
}
