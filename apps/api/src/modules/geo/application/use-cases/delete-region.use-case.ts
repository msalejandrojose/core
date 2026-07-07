import { Inject, Injectable } from '@nestjs/common';
import { RegionNotFoundError } from '../../domain/errors/region-not-found.error';
import {
  REGION_REPOSITORY,
  type RegionRepositoryPort,
} from '../ports/region-repository.port';

@Injectable()
export class DeleteRegionUseCase {
  constructor(
    @Inject(REGION_REPOSITORY) private readonly regions: RegionRepositoryPort,
  ) {}

  // Al borrar la comunidad, sus provincias quedan con `regionId = null`
  // (onDelete: SetNull); no se borran en cascada.
  async execute(id: string): Promise<void> {
    const existing = await this.regions.findById(id);
    if (!existing) throw new RegionNotFoundError(id);
    await this.regions.delete(id);
  }
}
