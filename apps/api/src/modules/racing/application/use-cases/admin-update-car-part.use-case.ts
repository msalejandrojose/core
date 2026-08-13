import { Inject, Injectable } from '@nestjs/common';
import {
  CarPart,
  CarPartCategory,
} from '../../domain/entities/car-part.entity';
import { CarPartNotFoundError } from '../../domain/errors/car-part-not-found.error';
import {
  CAR_PART_REPOSITORY,
  type CarPartRepositoryPort,
} from '../ports/car-part-repository.port';

// El `code` no es editable, igual que en `CarArchetype`.
export interface UpdateCarPartInput {
  category?: CarPartCategory;
  name?: string;
  speedScale?: number;
  grip?: number;
  isActive?: boolean;
}

@Injectable()
export class AdminUpdateCarPartUseCase {
  constructor(
    @Inject(CAR_PART_REPOSITORY) private readonly parts: CarPartRepositoryPort,
  ) {}

  async execute(id: string, input: UpdateCarPartInput): Promise<CarPart> {
    const existing = await this.parts.findById(id);
    if (!existing) throw new CarPartNotFoundError(id);

    return this.parts.update(id, {
      category: input.category,
      name: input.name,
      speedScale: input.speedScale,
      grip: input.grip,
      isActive: input.isActive,
    });
  }
}
