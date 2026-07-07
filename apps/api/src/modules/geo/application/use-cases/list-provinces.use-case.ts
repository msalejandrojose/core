import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Province } from '../../domain/entities/province.entity';
import {
  PROVINCE_REPOSITORY,
  type ListProvincesOptions,
  type ProvinceRepositoryPort,
} from '../ports/province-repository.port';

@Injectable()
export class ListProvincesUseCase {
  constructor(
    @Inject(PROVINCE_REPOSITORY)
    private readonly provinces: ProvinceRepositoryPort,
  ) {}

  execute(opts: ListProvincesOptions): Promise<PaginatedResult<Province>> {
    return this.provinces.list(opts);
  }
}
