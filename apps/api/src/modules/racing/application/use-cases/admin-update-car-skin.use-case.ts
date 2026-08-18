import { Inject, Injectable } from '@nestjs/common';
import { CarSkin } from '../../domain/entities/car-skin.entity';
import { CarSkinNotFoundError } from '../../domain/errors/car-skin-not-found.error';
import {
  CAR_SKIN_REPOSITORY,
  type CarSkinRepositoryPort,
} from '../ports/car-skin-repository.port';

// El `code` no es editable, igual que en `CarArchetype`/`CarPart`.
export interface UpdateCarSkinInput {
  name?: string;
  modelPath?: string;
  isUnlockedByDefault?: boolean;
  isActive?: boolean;
}

@Injectable()
export class AdminUpdateCarSkinUseCase {
  constructor(
    @Inject(CAR_SKIN_REPOSITORY) private readonly skins: CarSkinRepositoryPort,
  ) {}

  async execute(id: string, input: UpdateCarSkinInput): Promise<CarSkin> {
    const existing = await this.skins.findById(id);
    if (!existing) throw new CarSkinNotFoundError(id);

    return this.skins.update(id, {
      name: input.name,
      modelPath: input.modelPath,
      isUnlockedByDefault: input.isUnlockedByDefault,
      isActive: input.isActive,
    });
  }
}
