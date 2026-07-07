import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Municipality } from '../../domain/entities/municipality.entity';
import {
  MUNICIPALITY_REPOSITORY,
  type ListMunicipalitiesOptions,
  type MunicipalityRepositoryPort,
} from '../ports/municipality-repository.port';

@Injectable()
export class ListMunicipalitiesUseCase {
  constructor(
    @Inject(MUNICIPALITY_REPOSITORY)
    private readonly municipalities: MunicipalityRepositoryPort,
  ) {}

  execute(
    opts: ListMunicipalitiesOptions,
  ): Promise<PaginatedResult<Municipality>> {
    return this.municipalities.list(opts);
  }
}
