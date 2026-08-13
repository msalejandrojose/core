import { Inject, Injectable } from '@nestjs/common';
import {
  CAR_ARCHETYPE_REPOSITORY,
  type CarArchetypeRepositoryPort,
} from '../ports/car-archetype-repository.port';
import {
  CAR_PART_REPOSITORY,
  type CarPartRepositoryPort,
} from '../ports/car-part-repository.port';
import { CarArchetype } from '../../domain/entities/car-archetype.entity';
import { CarPart } from '../../domain/entities/car-part.entity';

export interface CarCatalog {
  archetypes: CarArchetype[];
  parts: CarPart[];
}

// Catálogo de cara al jugador: solo arquetipos y piezas activos.
@Injectable()
export class ListCarCatalogUseCase {
  constructor(
    @Inject(CAR_ARCHETYPE_REPOSITORY)
    private readonly archetypes: CarArchetypeRepositoryPort,
    @Inject(CAR_PART_REPOSITORY) private readonly parts: CarPartRepositoryPort,
  ) {}

  async execute(): Promise<CarCatalog> {
    const [archetypes, parts] = await Promise.all([
      this.archetypes.listActive(),
      this.parts.listActive(),
    ]);
    return { archetypes, parts };
  }
}
