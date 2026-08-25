import { Inject, Injectable } from '@nestjs/common';
import { GrandPrix } from '../../domain/entities/grand-prix.entity';
import { GrandPrixNotFoundError } from '../../domain/errors/grand-prix-not-found.error';
import {
  GRAND_PRIX_REPOSITORY,
  type GrandPrixRepositoryPort,
} from '../ports/grand-prix-repository.port';

@Injectable()
export class AdminGetGrandPrixUseCase {
  constructor(
    @Inject(GRAND_PRIX_REPOSITORY)
    private readonly grandPrixes: GrandPrixRepositoryPort,
  ) {}

  // De cara al backoffice: uno inactivo también se puede consultar (hace
  // falta para poder reactivarlo).
  async execute(id: string): Promise<GrandPrix> {
    const grandPrix = await this.grandPrixes.findById(id);
    if (!grandPrix) throw new GrandPrixNotFoundError(id);
    return grandPrix;
  }
}
