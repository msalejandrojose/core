import { Inject, Injectable } from '@nestjs/common';
import { CarSkin } from '../../domain/entities/car-skin.entity';
import { CarSkinNotFoundError } from '../../domain/errors/car-skin-not-found.error';
import {
  CAR_SKIN_REPOSITORY,
  type CarSkinRepositoryPort,
} from '../ports/car-skin-repository.port';

@Injectable()
export class AdminGetCarSkinUseCase {
  constructor(
    @Inject(CAR_SKIN_REPOSITORY) private readonly skins: CarSkinRepositoryPort,
  ) {}

  async execute(id: string): Promise<CarSkin> {
    const skin = await this.skins.findById(id);
    if (!skin) throw new CarSkinNotFoundError(id);
    return skin;
  }
}
