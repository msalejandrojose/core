import { Inject, Injectable } from '@nestjs/common';
import { Country } from '../../domain/entities/country.entity';
import { CountryAlreadyExistsError } from '../../domain/errors/country-already-exists.error';
import {
  COUNTRY_REPOSITORY,
  type CountryRepositoryPort,
} from '../ports/country-repository.port';

export interface CreateCountryInput {
  iso2: string;
  iso3: string;
  numericCode?: string | null;
  name: string;
  nativeName?: string | null;
  phoneCode?: string | null;
  isActive?: boolean;
}

@Injectable()
export class CreateCountryUseCase {
  constructor(
    @Inject(COUNTRY_REPOSITORY)
    private readonly countries: CountryRepositoryPort,
  ) {}

  async execute(input: CreateCountryInput): Promise<Country> {
    const iso2 = input.iso2.toUpperCase();
    const iso3 = input.iso3.toUpperCase();
    if (await this.countries.existsIso(iso2, iso3)) {
      throw new CountryAlreadyExistsError(`${iso2}/${iso3}`);
    }
    return this.countries.create({
      iso2,
      iso3,
      numericCode: input.numericCode ?? null,
      name: input.name,
      nativeName: input.nativeName ?? null,
      phoneCode: input.phoneCode ?? null,
      isActive: input.isActive ?? true,
    });
  }
}
