import { Inject, Injectable } from '@nestjs/common';
import { Region } from '../../domain/entities/region.entity';
import { CountryNotFoundError } from '../../domain/errors/country-not-found.error';
import { RegionAlreadyExistsError } from '../../domain/errors/region-already-exists.error';
import {
  COUNTRY_REPOSITORY,
  type CountryRepositoryPort,
} from '../ports/country-repository.port';
import {
  REGION_REPOSITORY,
  type RegionRepositoryPort,
} from '../ports/region-repository.port';

export interface CreateRegionInput {
  code: string;
  name: string;
  countryId: string;
}

@Injectable()
export class CreateRegionUseCase {
  constructor(
    @Inject(REGION_REPOSITORY) private readonly regions: RegionRepositoryPort,
    @Inject(COUNTRY_REPOSITORY)
    private readonly countries: CountryRepositoryPort,
  ) {}

  async execute(input: CreateRegionInput): Promise<Region> {
    const country = await this.countries.findById(input.countryId);
    if (!country) throw new CountryNotFoundError(input.countryId);
    if (await this.regions.existsCode(input.countryId, input.code)) {
      throw new RegionAlreadyExistsError(input.code, input.countryId);
    }
    return this.regions.create({
      code: input.code,
      name: input.name,
      countryId: input.countryId,
    });
  }
}
