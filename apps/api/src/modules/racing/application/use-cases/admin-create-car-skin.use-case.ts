import { Inject, Injectable } from '@nestjs/common';
import { CarSkin } from '../../domain/entities/car-skin.entity';
import { CarSkinCodeAlreadyExistsError } from '../../domain/errors/car-skin-code-already-exists.error';
import {
  CAR_SKIN_REPOSITORY,
  type CarSkinRepositoryPort,
} from '../ports/car-skin-repository.port';

export interface CreateCarSkinInput {
  code: string;
  name: string;
  modelPath: string;
  isUnlockedByDefault?: boolean;
  isActive?: boolean;
}

@Injectable()
export class AdminCreateCarSkinUseCase {
  constructor(
    @Inject(CAR_SKIN_REPOSITORY) private readonly skins: CarSkinRepositoryPort,
  ) {}

  async execute(input: CreateCarSkinInput): Promise<CarSkin> {
    if (await this.skins.existsCode(input.code)) {
      throw new CarSkinCodeAlreadyExistsError(input.code);
    }
    return this.skins.create({
      code: input.code,
      name: input.name,
      modelPath: input.modelPath,
      isUnlockedByDefault: input.isUnlockedByDefault ?? true,
      isActive: input.isActive ?? true,
    });
  }
}
