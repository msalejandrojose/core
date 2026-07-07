import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { PostalCode } from '../../domain/entities/postal-code.entity';

export const POSTAL_CODE_REPOSITORY = Symbol('GEO_POSTAL_CODE_REPOSITORY');

export interface CreatePostalCodeData {
  code: string;
  municipalityId: string;
}

export interface UpdatePostalCodePatch {
  code?: string;
  municipalityId?: string;
}

export interface ListPostalCodesOptions {
  page: number;
  limit: number;
  search?: string;
  municipalityId?: string;
}

export interface PostalCodeRepositoryPort {
  create(data: CreatePostalCodeData): Promise<PostalCode>;
  update(id: string, patch: UpdatePostalCodePatch): Promise<PostalCode>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<PostalCode | null>;
  existsCode(
    municipalityId: string,
    code: string,
    exceptId?: string,
  ): Promise<boolean>;
  list(opts: ListPostalCodesOptions): Promise<PaginatedResult<PostalCode>>;
}
