import { Inject, Injectable } from '@nestjs/common';
import { Country } from '../../domain/entities/country.entity';
import { CountryNotFoundError } from '../../domain/errors/country-not-found.error';
import {
  COUNTRY_REPOSITORY,
  type CountryRepositoryPort,
} from '../ports/country-repository.port';

@Injectable()
export class GetCountryUseCase {
  constructor(
    @Inject(COUNTRY_REPOSITORY)
    private readonly countries: CountryRepositoryPort,
  ) {}

  async execute(id: string): Promise<Country> {
    const country = await this.countries.findById(id);
    if (!country) throw new CountryNotFoundError(id);
    return country;
  }
}
