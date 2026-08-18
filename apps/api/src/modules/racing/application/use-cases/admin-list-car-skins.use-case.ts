import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { CarSkin } from '../../domain/entities/car-skin.entity';
import {
  AdminListCarSkinsOptions,
  CAR_SKIN_REPOSITORY,
  type CarSkinRepositoryPort,
} from '../ports/car-skin-repository.port';

@Injectable()
export class AdminListCarSkinsUseCase {
  constructor(
    @Inject(CAR_SKIN_REPOSITORY) private readonly skins: CarSkinRepositoryPort,
  ) {}

  execute(opts: AdminListCarSkinsOptions): Promise<PaginatedResult<CarSkin>> {
    return this.skins.listAll(opts);
  }
}
