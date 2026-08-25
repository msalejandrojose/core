import { Inject, Injectable } from '@nestjs/common';
import { PlayerCarLoadout } from '../../domain/entities/player-car-loadout.entity';
import { CarArchetypeNotFoundError } from '../../domain/errors/car-archetype-not-found.error';
import { CarArchetypeNotOwnedError } from '../../domain/errors/car-archetype-not-owned.error';
import { CarPartNotFoundError } from '../../domain/errors/car-part-not-found.error';
import { CarPartNotOwnedError } from '../../domain/errors/car-part-not-owned.error';
import { CarSkinNotFoundError } from '../../domain/errors/car-skin-not-found.error';
import { CarSkinNotOwnedError } from '../../domain/errors/car-skin-not-owned.error';
import { InvalidCarLoadoutError } from '../../domain/errors/invalid-car-loadout.error';
import { validateCarLoadoutSelection } from '../../domain/validate-car-loadout';
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
  PLAYER_CAR_LOADOUT_REPOSITORY,
  type PlayerCarLoadoutRepositoryPort,
} from '../ports/player-car-loadout-repository.port';
import {
  PLAYER_CAR_PART_REPOSITORY,
  type PlayerCarPartRepositoryPort,
} from '../ports/player-car-part-repository.port';
import {
  PLAYER_CAR_SKIN_REPOSITORY,
  type PlayerCarSkinRepositoryPort,
} from '../ports/player-car-skin-repository.port';

// `undefined` en un hueco de pieza o skin = no lo toques (deja lo que
// hubiera). `null` = vacíalo. `archetypeId` es siempre obligatorio: equipar
// es "esta es la configuración completa que quiero", no un parche sobre el
// arquetipo.
export interface SetPlayerCarLoadoutInput {
  archetypeId: string;
  tiresPartId?: string | null;
  wingPartId?: string | null;
  chassisPartId?: string | null;
  skinId?: string | null;
}

@Injectable()
export class SetPlayerCarLoadoutUseCase {
  constructor(
    @Inject(PLAYER_CAR_LOADOUT_REPOSITORY)
    private readonly loadouts: PlayerCarLoadoutRepositoryPort,
    @Inject(CAR_ARCHETYPE_REPOSITORY)
    private readonly archetypes: CarArchetypeRepositoryPort,
    @Inject(CAR_PART_REPOSITORY) private readonly parts: CarPartRepositoryPort,
    @Inject(CAR_SKIN_REPOSITORY) private readonly skins: CarSkinRepositoryPort,
    @Inject(PLAYER_CAR_SKIN_REPOSITORY)
    private readonly skinOwnerships: PlayerCarSkinRepositoryPort,
    @Inject(PLAYER_CAR_ARCHETYPE_REPOSITORY)
    private readonly archetypeOwnerships: PlayerCarArchetypeRepositoryPort,
    @Inject(PLAYER_CAR_PART_REPOSITORY)
    private readonly partOwnerships: PlayerCarPartRepositoryPort,
  ) {}

  async execute(
    userId: string,
    input: SetPlayerCarLoadoutInput,
  ): Promise<PlayerCarLoadout> {
    const existing = await this.loadouts.findByUserId(userId);

    const tiresPartId = this.resolveSlot(
      input.tiresPartId,
      existing?.tiresPartId,
    );
    const wingPartId = this.resolveSlot(input.wingPartId, existing?.wingPartId);
    const chassisPartId = this.resolveSlot(
      input.chassisPartId,
      existing?.chassisPartId,
    );
    const skinId = this.resolveSlot(input.skinId, existing?.skinId);

    const [archetype, tiresPart, wingPart, chassisPart, skin] =
      await Promise.all([
        this.archetypes.findById(input.archetypeId),
        tiresPartId ? this.parts.findById(tiresPartId) : Promise.resolve(null),
        wingPartId ? this.parts.findById(wingPartId) : Promise.resolve(null),
        chassisPartId
          ? this.parts.findById(chassisPartId)
          : Promise.resolve(null),
        skinId ? this.skins.findById(skinId) : Promise.resolve(null),
      ]);

    // "No encontrado" y "hueco vacío" son cosas distintas aunque las dos
    // resuelvan a `null` — se separan aquí, antes de que lleguen al
    // validador de dominio (que solo entiende huecos vacíos como válidos).
    if (!archetype) {
      throw new CarArchetypeNotFoundError(input.archetypeId);
    }
    if (tiresPartId && !tiresPart) throw new CarPartNotFoundError(tiresPartId);
    if (wingPartId && !wingPart) throw new CarPartNotFoundError(wingPartId);
    if (chassisPartId && !chassisPart) {
      throw new CarPartNotFoundError(chassisPartId);
    }
    if (skinId && !skin) throw new CarSkinNotFoundError(skinId);

    // Propiedad: necesita I/O sobre el jugador, así que se comprueba aquí,
    // antes del validador de dominio (que solo mira reglas puras). Mismo
    // criterio para los cuatro — arquetipo, las tres piezas y el skin — solo
    // cambia el repositorio de propiedad que resuelve cada uno (TASK-319).
    if (!archetype.isUnlockedByDefault) {
      const owns = await this.archetypeOwnerships.ownsArchetype(
        userId,
        archetype.id,
      );
      if (!owns) throw new CarArchetypeNotOwnedError(archetype.id);
    }
    for (const part of [tiresPart, wingPart, chassisPart]) {
      if (part && !part.isUnlockedByDefault) {
        const owns = await this.partOwnerships.ownsPart(userId, part.id);
        if (!owns) throw new CarPartNotOwnedError(part.id);
      }
    }
    if (skin && !skin.isUnlockedByDefault) {
      const owns = await this.skinOwnerships.ownsSkin(userId, skin.id);
      if (!owns) throw new CarSkinNotOwnedError(skin.id);
    }

    const validation = validateCarLoadoutSelection({
      archetype,
      tiresPart,
      wingPart,
      chassisPart,
      skin,
    });
    if (!validation.ok) {
      throw new InvalidCarLoadoutError(validation.reason, validation.details);
    }

    return this.loadouts.upsert(userId, {
      archetypeId: input.archetypeId,
      tiresPartId,
      wingPartId,
      chassisPartId,
      skinId,
    });
  }

  private resolveSlot(
    input: string | null | undefined,
    existing: string | null | undefined,
  ): string | null {
    return input !== undefined ? input : (existing ?? null);
  }
}
