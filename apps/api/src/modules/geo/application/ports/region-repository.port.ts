import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Region } from '../../domain/entities/region.entity';

export const REGION_REPOSITORY = Symbol('GEO_REGION_REPOSITORY');

export interface CreateRegionData {
  code: string;
  name: string;
  countryId: string;
}

export interface UpdateRegionPatch {
  code?: string;
  name?: string;
  countryId?: string;
}

export interface ListRegionsOptions {
  page: number;
  limit: number;
  search?: string;
  countryId?: string;
}

export interface RegionRepositoryPort {
  create(data: CreateRegionData): Promise<Region>;
  update(id: string, patch: UpdateRegionPatch): Promise<Region>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Region | null>;
  existsCode(
    countryId: string,
    code: string,
    exceptId?: string,
  ): Promise<boolean>;
  list(opts: ListRegionsOptions): Promise<PaginatedResult<Region>>;
}
