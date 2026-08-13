import { Inject, Injectable } from '@nestjs/common';
import { CarArchetype } from '../../domain/entities/car-archetype.entity';
import { CarArchetypeCodeAlreadyExistsError } from '../../domain/errors/car-archetype-code-already-exists.error';
import {
  CAR_ARCHETYPE_REPOSITORY,
  type CarArchetypeRepositoryPort,
} from '../ports/car-archetype-repository.port';

export interface CreateCarArchetypeInput {
  code: string;
  name: string;
  speedScale: number;
  grip: number;
  offroadGripModifier: number;
  isActive?: boolean;
}

@Injectable()
export class AdminCreateCarArchetypeUseCase {
  constructor(
    @Inject(CAR_ARCHETYPE_REPOSITORY)
    private readonly archetypes: CarArchetypeRepositoryPort,
  ) {}

  async execute(input: CreateCarArchetypeInput): Promise<CarArchetype> {
    if (await this.archetypes.existsCode(input.code)) {
      throw new CarArchetypeCodeAlreadyExistsError(input.code);
    }
    return this.archetypes.create({
      code: input.code,
      name: input.name,
      speedScale: input.speedScale,
      grip: input.grip,
      offroadGripModifier: input.offroadGripModifier,
      isActive: input.isActive ?? true,
    });
  }
}
