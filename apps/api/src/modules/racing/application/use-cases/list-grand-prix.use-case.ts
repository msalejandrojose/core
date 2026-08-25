import { Inject, Injectable } from '@nestjs/common';
import { GrandPrix } from '../../domain/entities/grand-prix.entity';
import {
  GRAND_PRIX_REPOSITORY,
  type GrandPrixRepositoryPort,
} from '../ports/grand-prix-repository.port';

@Injectable()
export class ListGrandPrixUseCase {
  constructor(
    @Inject(GRAND_PRIX_REPOSITORY)
    private readonly grandPrixes: GrandPrixRepositoryPort,
  ) {}

  async execute(): Promise<GrandPrix[]> {
    return this.grandPrixes.findActive();
  }
}
