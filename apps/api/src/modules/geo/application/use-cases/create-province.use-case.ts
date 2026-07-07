import { Inject, Injectable } from '@nestjs/common';
import { Province } from '../../domain/entities/province.entity';
import { CountryNotFoundError } from '../../domain/errors/country-not-found.error';
import { ProvinceAlreadyExistsError } from '../../domain/errors/province-already-exists.error';
import { RegionNotFoundError } from '../../domain/errors/region-not-found.error';
import {
  COUNTRY_REPOSITORY,
  type CountryRepositoryPort,
} from '../ports/country-repository.port';
import {
  PROVINCE_REPOSITORY,
  type ProvinceRepositoryPort,
} from '../ports/province-repository.port';
import {
  REGION_REPOSITORY,
  type RegionRepositoryPort,
} from '../ports/region-repository.port';

export interface CreateProvinceInput {
  code: string;
  name: string;
  countryId: string;
  regionId?: string | null;
}

@Injectable()
export class CreateProvinceUseCase {
  constructor(
    @Inject(PROVINCE_REPOSITORY)
    private readonly provinces: ProvinceRepositoryPort,
    @Inject(COUNTRY_REPOSITORY)
    private readonly countries: CountryRepositoryPort,
    @Inject(REGION_REPOSITORY) private readonly regions: RegionRepositoryPort,
  ) {}

  async execute(input: CreateProvinceInput): Promise<Province> {
    const country = await this.countries.findById(input.countryId);
    if (!country) throw new CountryNotFoundError(input.countryId);
    if (input.regionId) {
      const region = await this.regions.findById(input.regionId);
      if (!region) throw new RegionNotFoundError(input.regionId);
    }
    if (await this.provinces.existsCode(input.countryId, input.code)) {
      throw new ProvinceAlreadyExistsError(input.code, input.countryId);
    }
    return this.provinces.create({
      code: input.code,
      name: input.name,
      countryId: input.countryId,
      regionId: input.regionId ?? null,
    });
  }
}
