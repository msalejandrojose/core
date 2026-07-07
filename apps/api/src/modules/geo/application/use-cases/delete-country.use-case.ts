import { Inject, Injectable } from '@nestjs/common';
import { CountryNotFoundError } from '../../domain/errors/country-not-found.error';
import {
  COUNTRY_REPOSITORY,
  type CountryRepositoryPort,
} from '../ports/country-repository.port';

@Injectable()
export class DeleteCountryUseCase {
  constructor(
    @Inject(COUNTRY_REPOSITORY)
    private readonly countries: CountryRepositoryPort,
  ) {}

  // Borrar un país arrastra en cascada sus comunidades, provincias, municipios
  // y códigos postales (onDelete: Cascade en el schema).
  async execute(id: string): Promise<void> {
    const existing = await this.countries.findById(id);
    if (!existing) throw new CountryNotFoundError(id);
    await this.countries.delete(id);
  }
}
