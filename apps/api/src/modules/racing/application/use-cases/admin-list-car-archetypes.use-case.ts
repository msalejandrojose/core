import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { CarArchetype } from '../../domain/entities/car-archetype.entity';
import {
  AdminListCarArchetypesOptions,
  CAR_ARCHETYPE_REPOSITORY,
  type CarArchetypeRepositoryPort,
} from '../ports/car-archetype-repository.port';

@Injectable()
export class AdminListCarArchetypesUseCase {
  constructor(
    @Inject(CAR_ARCHETYPE_REPOSITORY)
    private readonly archetypes: CarArchetypeRepositoryPort,
  ) {}

  execute(
    opts: AdminListCarArchetypesOptions,
  ): Promise<PaginatedResult<CarArchetype>> {
    return this.archetypes.listAll(opts);
  }
}
