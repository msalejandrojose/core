import { Inject, Injectable } from '@nestjs/common';
import {
  CAR_ARCHETYPE_REPOSITORY,
  type CarArchetypeRepositoryPort,
} from '../ports/car-archetype-repository.port';
import {
  CAR_PART_REPOSITORY,
  type CarPartRepositoryPort,
} from '../ports/car-part-repository.port';
import {
  CAR_SKIN_REPOSITORY,
  type CarSkinRepositoryPort,
} from '../ports/car-skin-repository.port';
import {
  PLAYER_CAR_SKIN_REPOSITORY,
  type PlayerCarSkinRepositoryPort,
} from '../ports/player-car-skin-repository.port';
import { CarArchetype } from '../../domain/entities/car-archetype.entity';
import { CarPart } from '../../domain/entities/car-part.entity';
import { CarSkin } from '../../domain/entities/car-skin.entity';

export interface CarCatalogSkin {
  skin: CarSkin;
  /** Puede equiparlo ya mismo: es gratis para todos o el jugador lo tiene
   *  desbloqueado. */
  owned: boolean;
}

export interface CarCatalog {
  archetypes: CarArchetype[];
  parts: CarPart[];
  skins: CarCatalogSkin[];
}

// Catálogo de cara al jugador: solo arquetipos, piezas y skins activos. Los
// skins llevan además si el jugador que consulta los tiene desbloqueados,
// por eso este use-case (a diferencia de piezas/arquetipos) necesita el
// `userId` de quien pregunta.
@Injectable()
export class ListCarCatalogUseCase {
  constructor(
    @Inject(CAR_ARCHETYPE_REPOSITORY)
    private readonly archetypes: CarArchetypeRepositoryPort,
    @Inject(CAR_PART_REPOSITORY) private readonly parts: CarPartRepositoryPort,
    @Inject(CAR_SKIN_REPOSITORY) private readonly skins: CarSkinRepositoryPort,
    @Inject(PLAYER_CAR_SKIN_REPOSITORY)
    private readonly skinOwnerships: PlayerCarSkinRepositoryPort,
  ) {}

  async execute(userId: string): Promise<CarCatalog> {
    const [archetypes, parts, skins, ownedSkinIds] = await Promise.all([
      this.archetypes.listActive(),
      this.parts.listActive(),
      this.skins.listActive(),
      this.skinOwnerships.listOwnedSkinIds(userId),
    ]);

    const ownedSet = new Set(ownedSkinIds);
    return {
      archetypes,
      parts,
      skins: skins.map((skin) => ({
        skin,
        owned: skin.isUnlockedByDefault || ownedSet.has(skin.id),
      })),
    };
  }
}
