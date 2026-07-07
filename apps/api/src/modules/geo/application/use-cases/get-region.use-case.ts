import { Inject, Injectable } from '@nestjs/common';
import { Region } from '../../domain/entities/region.entity';
import { RegionNotFoundError } from '../../domain/errors/region-not-found.error';
import {
  REGION_REPOSITORY,
  type RegionRepositoryPort,
} from '../ports/region-repository.port';

@Injectable()
export class GetRegionUseCase {
  constructor(
    @Inject(REGION_REPOSITORY) private readonly regions: RegionRepositoryPort,
  ) {}

  async execute(id: string): Promise<Region> {
    const region = await this.regions.findById(id);
    if (!region) throw new RegionNotFoundError(id);
    return region;
  }
}
