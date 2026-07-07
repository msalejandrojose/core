import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Region } from '../../domain/entities/region.entity';
import {
  REGION_REPOSITORY,
  type ListRegionsOptions,
  type RegionRepositoryPort,
} from '../ports/region-repository.port';

@Injectable()
export class ListRegionsUseCase {
  constructor(
    @Inject(REGION_REPOSITORY) private readonly regions: RegionRepositoryPort,
  ) {}

  execute(opts: ListRegionsOptions): Promise<PaginatedResult<Region>> {
    return this.regions.list(opts);
  }
}
