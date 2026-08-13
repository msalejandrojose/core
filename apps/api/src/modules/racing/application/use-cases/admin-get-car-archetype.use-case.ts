import { Inject, Injectable } from '@nestjs/common';
import { CarArchetype } from '../../domain/entities/car-archetype.entity';
import { CarArchetypeNotFoundError } from '../../domain/errors/car-archetype-not-found.error';
import {
  CAR_ARCHETYPE_REPOSITORY,
  type CarArchetypeRepositoryPort,
} from '../ports/car-archetype-repository.port';

@Injectable()
export class AdminGetCarArchetypeUseCase {
  constructor(
    @Inject(CAR_ARCHETYPE_REPOSITORY)
    private readonly archetypes: CarArchetypeRepositoryPort,
  ) {}

  async execute(id: string): Promise<CarArchetype> {
    const archetype = await this.archetypes.findById(id);
    if (!archetype) throw new CarArchetypeNotFoundError(id);
    return archetype;
  }
}
