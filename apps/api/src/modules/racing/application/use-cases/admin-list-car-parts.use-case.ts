import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { CarPart } from '../../domain/entities/car-part.entity';
import {
  AdminListCarPartsOptions,
  CAR_PART_REPOSITORY,
  type CarPartRepositoryPort,
} from '../ports/car-part-repository.port';

@Injectable()
export class AdminListCarPartsUseCase {
  constructor(
    @Inject(CAR_PART_REPOSITORY) private readonly parts: CarPartRepositoryPort,
  ) {}

  execute(opts: AdminListCarPartsOptions): Promise<PaginatedResult<CarPart>> {
    return this.parts.listAll(opts);
  }
}
