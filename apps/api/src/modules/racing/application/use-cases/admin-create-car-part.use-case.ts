import { Inject, Injectable } from '@nestjs/common';
import {
  CarPart,
  CarPartCategory,
} from '../../domain/entities/car-part.entity';
import { CarPartCodeAlreadyExistsError } from '../../domain/errors/car-part-code-already-exists.error';
import {
  CAR_PART_REPOSITORY,
  type CarPartRepositoryPort,
} from '../ports/car-part-repository.port';

export interface CreateCarPartInput {
  code: string;
  category: CarPartCategory;
  name: string;
  speedScale: number;
  grip: number;
  isActive?: boolean;
}

@Injectable()
export class AdminCreateCarPartUseCase {
  constructor(
    @Inject(CAR_PART_REPOSITORY) private readonly parts: CarPartRepositoryPort,
  ) {}

  async execute(input: CreateCarPartInput): Promise<CarPart> {
    if (await this.parts.existsCode(input.code)) {
      throw new CarPartCodeAlreadyExistsError(input.code);
    }
    return this.parts.create({
      code: input.code,
      category: input.category,
      name: input.name,
      speedScale: input.speedScale,
      grip: input.grip,
      isActive: input.isActive ?? true,
    });
  }
}
