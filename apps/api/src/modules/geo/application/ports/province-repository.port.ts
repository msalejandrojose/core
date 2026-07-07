import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Province } from '../../domain/entities/province.entity';

export const PROVINCE_REPOSITORY = Symbol('GEO_PROVINCE_REPOSITORY');

export interface CreateProvinceData {
  code: string;
  name: string;
  countryId: string;
  regionId: string | null;
}

export interface UpdateProvincePatch {
  code?: string;
  name?: string;
  countryId?: string;
  regionId?: string | null;
}

export interface ListProvincesOptions {
  page: number;
  limit: number;
  search?: string;
  countryId?: string;
  regionId?: string;
}

export interface ProvinceRepositoryPort {
  create(data: CreateProvinceData): Promise<Province>;
  update(id: string, patch: UpdateProvincePatch): Promise<Province>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Province | null>;
  existsCode(
    countryId: string,
    code: string,
    exceptId?: string,
  ): Promise<boolean>;
  list(opts: ListProvincesOptions): Promise<PaginatedResult<Province>>;
}
