import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { ApiSection } from '../../domain/entities/api-section.entity';
import {
  API_SECTION_REPOSITORY,
  type ApiSectionRepositoryPort,
  type ListApiSectionsOptions,
} from '../ports/api-section-repository.port';

@Injectable()
export class ListApiSectionsUseCase {
  static readonly SORTABLE = ['code', 'createdAt'] as const;

  constructor(
    @Inject(API_SECTION_REPOSITORY)
    private readonly sections: ApiSectionRepositoryPort,
  ) {}

  async execute(opts: ListApiSectionsOptions): Promise<PaginatedResult<ApiSection>> {
    const sort = opts.sort && (ListApiSectionsUseCase.SORTABLE as readonly string[]).includes(opts.sort)
      ? opts.sort
      : 'code';
    return this.sections.findMany({ ...opts, sort });
  }
}
