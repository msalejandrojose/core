import { Inject, Injectable } from '@nestjs/common';
import { Province } from '../../domain/entities/province.entity';
import { CountryNotFoundError } from '../../domain/errors/country-not-found.error';
import { ProvinceAlreadyExistsError } from '../../domain/errors/province-already-exists.error';
import { ProvinceNotFoundError } from '../../domain/errors/province-not-found.error';
import { RegionNotFoundError } from '../../domain/errors/region-not-found.error';
import {
  COUNTRY_REPOSITORY,
  type CountryRepositoryPort,
} from '../ports/country-repository.port';
import {
  PROVINCE_REPOSITORY,
  type ProvinceRepositoryPort,
  type UpdateProvincePatch,
} from '../ports/province-repository.port';
import {
  REGION_REPOSITORY,
  type RegionRepositoryPort,
} from '../ports/region-repository.port';

export interface UpdateProvinceInput {
  code?: string;
  name?: string;
  countryId?: string;
  regionId?: string | null;
}

@Injectable()
export class UpdateProvinceUseCase {
  constructor(
    @Inject(PROVINCE_REPOSITORY)
    private readonly provinces: ProvinceRepositoryPort,
    @Inject(COUNTRY_REPOSITORY)
    private readonly countries: CountryRepositoryPort,
    @Inject(REGION_REPOSITORY) private readonly regions: RegionRepositoryPort,
  ) {}

  async execute(id: string, input: UpdateProvinceInput): Promise<Province> {
    const existing = await this.provinces.findById(id);
    if (!existing) throw new ProvinceNotFoundError(id);

    if (
      input.countryId !== undefined &&
      input.countryId !== existing.countryId
    ) {
      const country = await this.countries.findById(input.countryId);
      if (!country) throw new CountryNotFoundError(input.countryId);
    }
    if (input.regionId) {
      const region = await this.regions.findById(input.regionId);
      if (!region) throw new RegionNotFoundError(input.regionId);
    }

    const nextCountryId = input.countryId ?? existing.countryId;
    const nextCode = input.code ?? existing.code;
    if (nextCode !== existing.code || nextCountryId !== existing.countryId) {
      if (await this.provinces.existsCode(nextCountryId, nextCode, id)) {
        throw new ProvinceAlreadyExistsError(nextCode, nextCountryId);
      }
    }

    const patch: UpdateProvincePatch = {
      code: input.code,
      name: input.name,
      countryId: input.countryId,
      regionId: input.regionId,
    };
    return this.provinces.update(id, patch);
  }
}
