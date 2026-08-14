import { Inject, Injectable } from '@nestjs/common';
import { RacingTerrainEffect } from '../../domain/entities/racing-terrain-effect.entity';
import {
  RACING_TERRAIN_EFFECT_REPOSITORY,
  type RacingTerrainEffectRepositoryPort,
} from '../ports/racing-terrain-effect-repository.port';

// Un único listado sirve al jugador (para saber a qué atenerse) y al
// backoffice (para editar): son 4 filas, sin estado activo/inactivo que
// filtrar, así que no hace falta separar "catálogo" de "administración" como
// con CarArchetype/CarPart.
@Injectable()
export class ListTerrainEffectsUseCase {
  constructor(
    @Inject(RACING_TERRAIN_EFFECT_REPOSITORY)
    private readonly effects: RacingTerrainEffectRepositoryPort,
  ) {}

  execute(): Promise<RacingTerrainEffect[]> {
    return this.effects.findAll();
  }
}
