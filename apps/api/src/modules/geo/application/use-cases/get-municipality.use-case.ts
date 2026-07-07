import { Inject, Injectable } from '@nestjs/common';
import { Municipality } from '../../domain/entities/municipality.entity';
import { MunicipalityNotFoundError } from '../../domain/errors/municipality-not-found.error';
import {
  MUNICIPALITY_REPOSITORY,
  type MunicipalityRepositoryPort,
} from '../ports/municipality-repository.port';

@Injectable()
export class GetMunicipalityUseCase {
  constructor(
    @Inject(MUNICIPALITY_REPOSITORY)
    private readonly municipalities: MunicipalityRepositoryPort,
  ) {}

  async execute(id: string): Promise<Municipality> {
    const municipality = await this.municipalities.findById(id);
    if (!municipality) throw new MunicipalityNotFoundError(id);
    return municipality;
  }
}
