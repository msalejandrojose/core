import { Inject, Injectable } from '@nestjs/common';
import { CarArchetype } from '../../domain/entities/car-archetype.entity';
import { CarArchetypeNotFoundError } from '../../domain/errors/car-archetype-not-found.error';
import {
  CAR_ARCHETYPE_REPOSITORY,
  type CarArchetypeRepositoryPort,
} from '../ports/car-archetype-repository.port';

// El `code` no es editable — igual que el slug de un circuito, es el
// identificador estable que referencian otras filas.
export interface UpdateCarArchetypeInput {
  name?: string;
  speedScale?: number;
  grip?: number;
  offroadGripModifier?: number;
  isUnlockedByDefault?: boolean;
  priceCoins?: number | null;
  isActive?: boolean;
}

@Injectable()
export class AdminUpdateCarArchetypeUseCase {
  constructor(
    @Inject(CAR_ARCHETYPE_REPOSITORY)
    private readonly archetypes: CarArchetypeRepositoryPort,
  ) {}

  async execute(
    id: string,
    input: UpdateCarArchetypeInput,
  ): Promise<CarArchetype> {
    const existing = await this.archetypes.findById(id);
    if (!existing) throw new CarArchetypeNotFoundError(id);

    return this.archetypes.update(id, {
      name: input.name,
      speedScale: input.speedScale,
      grip: input.grip,
      offroadGripModifier: input.offroadGripModifier,
      isUnlockedByDefault: input.isUnlockedByDefault,
      priceCoins: input.priceCoins,
      isActive: input.isActive,
    });
  }
}
