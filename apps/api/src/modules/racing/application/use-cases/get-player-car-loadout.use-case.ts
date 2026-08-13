import { Inject, Injectable } from '@nestjs/common';
import { CarStats, computeCarStats } from '../../domain/car-stats';
import { CarArchetype } from '../../domain/entities/car-archetype.entity';
import { CarPart } from '../../domain/entities/car-part.entity';
import { CarArchetypeNotFoundError } from '../../domain/errors/car-archetype-not-found.error';
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

// Arquetipo al que cae un jugador que nunca ha tocado su configuración de
// coche — sin fila en `PlayerCarLoadout` (ver comentario del modelo en
// schema.prisma). Si por lo que sea no existe (catálogo mal sembrado), se cae
// al primer arquetipo activo en vez de romper la consulta.
const DEFAULT_ARCHETYPE_CODE = 'normal';

export interface PlayerCarLoadoutResult {
  archetype: CarArchetype;
  tiresPart: CarPart | null;
  wingPart: CarPart | null;
  chassisPart: CarPart | null;
  stats: CarStats;
}

@Injectable()
export class GetPlayerCarLoadoutUseCase {
  constructor(
    @Inject(PLAYER_CAR_LOADOUT_REPOSITORY)
    private readonly loadouts: PlayerCarLoadoutRepositoryPort,
    @Inject(CAR_ARCHETYPE_REPOSITORY)
    private readonly archetypes: CarArchetypeRepositoryPort,
    @Inject(CAR_PART_REPOSITORY) private readonly parts: CarPartRepositoryPort,
  ) {}

  async execute(userId: string): Promise<PlayerCarLoadoutResult> {
    const existing = await this.loadouts.findByUserId(userId);

    const archetype = existing
      ? await this.archetypes.findById(existing.archetypeId)
      : await this.defaultArchetype();
    if (!archetype) {
      throw new CarArchetypeNotFoundError(existing?.archetypeId ?? 'default');
    }

    const [tiresPart, wingPart, chassisPart] = await Promise.all([
      this.findPartIfSet(existing?.tiresPartId),
      this.findPartIfSet(existing?.wingPartId),
      this.findPartIfSet(existing?.chassisPartId),
    ]);

    const stats = computeCarStats(archetype, {
      tires: tiresPart ?? undefined,
      wing: wingPart ?? undefined,
      chassis: chassisPart ?? undefined,
    });

    return { archetype, tiresPart, wingPart, chassisPart, stats };
  }

  private async defaultArchetype(): Promise<CarArchetype | null> {
    const active = await this.archetypes.listActive();
    return (
      active.find((a) => a.code === DEFAULT_ARCHETYPE_CODE) ?? active[0] ?? null
    );
  }

  private findPartIfSet(
    id: string | null | undefined,
  ): Promise<CarPart | null> {
    return id ? this.parts.findById(id) : Promise.resolve(null);
  }
}
