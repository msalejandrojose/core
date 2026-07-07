import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { PostalCode } from '../../domain/entities/postal-code.entity';
import {
  POSTAL_CODE_REPOSITORY,
  type ListPostalCodesOptions,
  type PostalCodeRepositoryPort,
} from '../ports/postal-code-repository.port';

@Injectable()
export class ListPostalCodesUseCase {
  constructor(
    @Inject(POSTAL_CODE_REPOSITORY)
    private readonly postalCodes: PostalCodeRepositoryPort,
  ) {}

  execute(opts: ListPostalCodesOptions): Promise<PaginatedResult<PostalCode>> {
    return this.postalCodes.list(opts);
  }
}
