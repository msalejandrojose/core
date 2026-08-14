import { Inject, Injectable } from '@nestjs/common';
import { GrandPrix } from '../../domain/entities/grand-prix.entity';
import { GrandPrixNotFoundError } from '../../domain/errors/grand-prix-not-found.error';
import {
  GRAND_PRIX_REPOSITORY,
  type GrandPrixRepositoryPort,
} from '../ports/grand-prix-repository.port';

@Injectable()
export class GetGrandPrixUseCase {
  constructor(
    @Inject(GRAND_PRIX_REPOSITORY)
    private readonly grandPrixes: GrandPrixRepositoryPort,
  ) {}

  // De cara al jugador: uno inactivo no existe, igual que no sale en el
  // catálogo de `ListGrandPrixUseCase`.
  async execute(id: string): Promise<GrandPrix> {
    const grandPrix = await this.grandPrixes.findById(id);
    if (!grandPrix || !grandPrix.isActive) {
      throw new GrandPrixNotFoundError(id);
    }
    return grandPrix;
  }
}
