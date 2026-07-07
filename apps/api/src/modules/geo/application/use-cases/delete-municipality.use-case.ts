import { Inject, Injectable } from '@nestjs/common';
import { MunicipalityNotFoundError } from '../../domain/errors/municipality-not-found.error';
import {
  MUNICIPALITY_REPOSITORY,
  type MunicipalityRepositoryPort,
} from '../ports/municipality-repository.port';

@Injectable()
export class DeleteMunicipalityUseCase {
  constructor(
    @Inject(MUNICIPALITY_REPOSITORY)
    private readonly municipalities: MunicipalityRepositoryPort,
  ) {}

  // Borrar un municipio arrastra sus códigos postales (cascada).
  async execute(id: string): Promise<void> {
    const existing = await this.municipalities.findById(id);
    if (!existing) throw new MunicipalityNotFoundError(id);
    await this.municipalities.delete(id);
  }
}
