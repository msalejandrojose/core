import { Inject, Injectable } from '@nestjs/common';
import { Country } from '../../domain/entities/country.entity';
import { CountryAlreadyExistsError } from '../../domain/errors/country-already-exists.error';
import { CountryNotFoundError } from '../../domain/errors/country-not-found.error';
import {
  COUNTRY_REPOSITORY,
  type CountryRepositoryPort,
  type UpdateCountryPatch,
} from '../ports/country-repository.port';

export interface UpdateCountryInput {
  iso2?: string;
  iso3?: string;
  numericCode?: string | null;
  name?: string;
  nativeName?: string | null;
  phoneCode?: string | null;
  isActive?: boolean;
}

@Injectable()
export class UpdateCountryUseCase {
  constructor(
    @Inject(COUNTRY_REPOSITORY)
    private readonly countries: CountryRepositoryPort,
  ) {}

  async execute(id: string, input: UpdateCountryInput): Promise<Country> {
    const existing = await this.countries.findById(id);
    if (!existing) throw new CountryNotFoundError(id);

    const patch: UpdateCountryPatch = {
      numericCode: input.numericCode,
      name: input.name,
      nativeName: input.nativeName,
      phoneCode: input.phoneCode,
      isActive: input.isActive,
    };
    if (input.iso2 !== undefined) patch.iso2 = input.iso2.toUpperCase();
    if (input.iso3 !== undefined) patch.iso3 = input.iso3.toUpperCase();

    const nextIso2 = patch.iso2 ?? existing.iso2;
    const nextIso3 = patch.iso3 ?? existing.iso3;
    if (nextIso2 !== existing.iso2 || nextIso3 !== existing.iso3) {
      if (await this.countries.existsIso(nextIso2, nextIso3, id)) {
        throw new CountryAlreadyExistsError(`${nextIso2}/${nextIso3}`);
      }
    }

    return this.countries.update(id, patch);
  }
}
