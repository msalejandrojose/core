import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { GrandPrix } from '../../domain/entities/grand-prix.entity';
import {
  GRAND_PRIX_REPOSITORY,
  type GrandPrixRepositoryPort,
} from '../ports/grand-prix-repository.port';

export interface AdminListGrandPrixInput {
  page: number;
  limit: number;
  search?: string;
}

@Injectable()
export class AdminListGrandPrixUseCase {
  constructor(
    @Inject(GRAND_PRIX_REPOSITORY)
    private readonly grandPrixes: GrandPrixRepositoryPort,
  ) {}

  async execute(
    input: AdminListGrandPrixInput,
  ): Promise<PaginatedResult<GrandPrix>> {
    return this.grandPrixes.listAdmin(input);
  }
}
