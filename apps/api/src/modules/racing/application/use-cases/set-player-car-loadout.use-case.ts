import { Inject, Injectable } from '@nestjs/common';
import { PlayerCarLoadout } from '../../domain/entities/player-car-loadout.entity';
import { CarArchetypeNotFoundError } from '../../domain/errors/car-archetype-not-found.error';
import { CarPartNotFoundError } from '../../domain/errors/car-part-not-found.error';
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
  PLAYER_CAR_LOADOUT_REPOSITORY,
  type PlayerCarLoadoutRepositoryPort,
} from '../ports/player-car-loadout-repository.port';

// `undefined` en un hueco de pieza = no lo toques (deja lo que hubiera).
// `null` = vacíalo. `archetypeId` es siempre obligatorio: equipar es "esta es
// la configuración completa que quiero", no un parche sobre el arquetipo.
export interface SetPlayerCarLoadoutInput {
  archetypeId: string;
  tiresPartId?: string | null;
  wingPartId?: string | null;
  chassisPartId?: string | null;
}

@Injectable()
export class SetPlayerCarLoadoutUseCase {
  constructor(
    @Inject(PLAYER_CAR_LOADOUT_REPOSITORY)
    private readonly loadouts: PlayerCarLoadoutRepositoryPort,
    @Inject(CAR_ARCHETYPE_REPOSITORY)
    private readonly archetypes: CarArchetypeRepositoryPort,
    @Inject(CAR_PART_REPOSITORY) private readonly parts: CarPartRepositoryPort,
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

    const [archetype, tiresPart, wingPart, chassisPart] = await Promise.all([
      this.archetypes.findById(input.archetypeId),
      tiresPartId ? this.parts.findById(tiresPartId) : Promise.resolve(null),
      wingPartId ? this.parts.findById(wingPartId) : Promise.resolve(null),
      chassisPartId
        ? this.parts.findById(chassisPartId)
        : Promise.resolve(null),
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

    const validation = validateCarLoadoutSelection({
      archetype,
      tiresPart,
      wingPart,
      chassisPart,
    });
    if (!validation.ok) {
      throw new InvalidCarLoadoutError(validation.reason, validation.details);
    }

    return this.loadouts.upsert(userId, {
      archetypeId: input.archetypeId,
      tiresPartId,
      wingPartId,
      chassisPartId,
    });
  }

  private resolveSlot(
    input: string | null | undefined,
    existing: string | null | undefined,
  ): string | null {
    return input !== undefined ? input : (existing ?? null);
  }
}
