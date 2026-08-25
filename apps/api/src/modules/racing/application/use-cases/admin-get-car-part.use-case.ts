import { Inject, Injectable } from '@nestjs/common';
import { CarPart } from '../../domain/entities/car-part.entity';
import { CarPartNotFoundError } from '../../domain/errors/car-part-not-found.error';
import {
  CAR_PART_REPOSITORY,
  type CarPartRepositoryPort,
} from '../ports/car-part-repository.port';

@Injectable()
export class AdminGetCarPartUseCase {
  constructor(
    @Inject(CAR_PART_REPOSITORY) private readonly parts: CarPartRepositoryPort,
  ) {}

  async execute(id: string): Promise<CarPart> {
    const part = await this.parts.findById(id);
    if (!part) throw new CarPartNotFoundError(id);
    return part;
  }
}
