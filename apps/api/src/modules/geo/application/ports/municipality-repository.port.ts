import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Municipality } from '../../domain/entities/municipality.entity';

export const MUNICIPALITY_REPOSITORY = Symbol('GEO_MUNICIPALITY_REPOSITORY');

export interface CreateMunicipalityData {
  code: string;
  name: string;
  provinceId: string;
}

export interface UpdateMunicipalityPatch {
  code?: string;
  name?: string;
  provinceId?: string;
}

export interface ListMunicipalitiesOptions {
  page: number;
  limit: number;
  search?: string;
  provinceId?: string;
}

export interface MunicipalityRepositoryPort {
  create(data: CreateMunicipalityData): Promise<Municipality>;
  update(id: string, patch: UpdateMunicipalityPatch): Promise<Municipality>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Municipality | null>;
  existsCode(
    provinceId: string,
    code: string,
    exceptId?: string,
  ): Promise<boolean>;
  list(opts: ListMunicipalitiesOptions): Promise<PaginatedResult<Municipality>>;
}
