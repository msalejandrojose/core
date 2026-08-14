import { DomainError } from '../../../../shared/errors/domain-error';

export class RacingTerrainEffectNotFoundError extends DomainError {
  constructor(type: string) {
    super(
      'RACING_TERRAIN_EFFECT_NOT_FOUND',
      `Efecto de terreno ${type} no encontrado.`,
      { type },
    );
  }
}
