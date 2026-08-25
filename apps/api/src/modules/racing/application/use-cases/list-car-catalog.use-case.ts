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
  PLAYER_CAR_ARCHETYPE_REPOSITORY,
  type PlayerCarArchetypeRepositoryPort,
} from '../ports/player-car-archetype-repository.port';
import {
  PLAYER_CAR_PART_REPOSITORY,
  type PlayerCarPartRepositoryPort,
} from '../ports/player-car-part-repository.port';
import {
  PLAYER_CAR_SKIN_REPOSITORY,
  type PlayerCarSkinRepositoryPort,
} from '../ports/player-car-skin-repository.port';
import { CarArchetype } from '../../domain/entities/car-archetype.entity';
import { CarPart } from '../../domain/entities/car-part.entity';
import { CarSkin } from '../../domain/entities/car-skin.entity';

export interface CarCatalogArchetype {
  archetype: CarArchetype;
  /** Puede equiparlo ya mismo: es gratis para todos o el jugador lo tiene
   *  desbloqueado. */
  owned: boolean;
}

export interface CarCatalogPart {
  part: CarPart;
  owned: boolean;
}

export interface CarCatalogSkin {
  skin: CarSkin;
  owned: boolean;
}

export interface CarCatalog {
  archetypes: CarCatalogArchetype[];
  parts: CarCatalogPart[];
  skins: CarCatalogSkin[];
}

// Catálogo de cara al jugador: solo arquetipos, piezas y skins activos, cada
// uno con si el jugador que consulta lo tiene desbloqueado (TASK-319) — por
// eso este use-case necesita el `userId` de quien pregunta, a diferencia de
// los listados de administración.
@Injectable()
export class ListCarCatalogUseCase {
  constructor(
    @Inject(CAR_ARCHETYPE_REPOSITORY)
    private readonly archetypes: CarArchetypeRepositoryPort,
    @Inject(CAR_PART_REPOSITORY) private readonly parts: CarPartRepositoryPort,
    @Inject(CAR_SKIN_REPOSITORY) private readonly skins: CarSkinRepositoryPort,
    @Inject(PLAYER_CAR_ARCHETYPE_REPOSITORY)
    private readonly archetypeOwnerships: PlayerCarArchetypeRepositoryPort,
    @Inject(PLAYER_CAR_PART_REPOSITORY)
    private readonly partOwnerships: PlayerCarPartRepositoryPort,
    @Inject(PLAYER_CAR_SKIN_REPOSITORY)
    private readonly skinOwnerships: PlayerCarSkinRepositoryPort,
  ) {}

  async execute(userId: string): Promise<CarCatalog> {
    const [
      archetypes,
      parts,
      skins,
      ownedArchetypeIds,
      ownedPartIds,
      ownedSkinIds,
    ] = await Promise.all([
      this.archetypes.listActive(),
      this.parts.listActive(),
      this.skins.listActive(),
      this.archetypeOwnerships.listOwnedArchetypeIds(userId),
      this.partOwnerships.listOwnedPartIds(userId),
      this.skinOwnerships.listOwnedSkinIds(userId),
    ]);

    const ownedArchetypeSet = new Set(ownedArchetypeIds);
    const ownedPartSet = new Set(ownedPartIds);
    const ownedSkinSet = new Set(ownedSkinIds);

    return {
      archetypes: archetypes.map((archetype) => ({
        archetype,
        owned:
          archetype.isUnlockedByDefault || ownedArchetypeSet.has(archetype.id),
      })),
      parts: parts.map((part) => ({
        part,
        owned: part.isUnlockedByDefault || ownedPartSet.has(part.id),
      })),
      skins: skins.map((skin) => ({
        skin,
        owned: skin.isUnlockedByDefault || ownedSkinSet.has(skin.id),
      })),
    };
  }
}
