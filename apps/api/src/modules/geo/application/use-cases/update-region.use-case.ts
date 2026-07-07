import { Inject, Injectable } from '@nestjs/common';
import { Region } from '../../domain/entities/region.entity';
import { CountryNotFoundError } from '../../domain/errors/country-not-found.error';
import { RegionAlreadyExistsError } from '../../domain/errors/region-already-exists.error';
import { RegionNotFoundError } from '../../domain/errors/region-not-found.error';
import {
  COUNTRY_REPOSITORY,
  type CountryRepositoryPort,
} from '../ports/country-repository.port';
import {
  REGION_REPOSITORY,
  type RegionRepositoryPort,
  type UpdateRegionPatch,
} from '../ports/region-repository.port';

export interface UpdateRegionInput {
  code?: string;
  name?: string;
  countryId?: string;
}

@Injectable()
export class UpdateRegionUseCase {
  constructor(
    @Inject(REGION_REPOSITORY) private readonly regions: RegionRepositoryPort,
    @Inject(COUNTRY_REPOSITORY)
    private readonly countries: CountryRepositoryPort,
  ) {}

  async execute(id: string, input: UpdateRegionInput): Promise<Region> {
    const existing = await this.regions.findById(id);
    if (!existing) throw new RegionNotFoundError(id);

    const nextCountryId = input.countryId ?? existing.countryId;
    if (
      input.countryId !== undefined &&
      input.countryId !== existing.countryId
    ) {
      const country = await this.countries.findById(input.countryId);
      if (!country) throw new CountryNotFoundError(input.countryId);
    }

    const nextCode = input.code ?? existing.code;
    if (nextCode !== existing.code || nextCountryId !== existing.countryId) {
      if (await this.regions.existsCode(nextCountryId, nextCode, id)) {
        throw new RegionAlreadyExistsError(nextCode, nextCountryId);
      }
    }

    const patch: UpdateRegionPatch = {
      code: input.code,
      name: input.name,
      countryId: input.countryId,
    };
    return this.regions.update(id, patch);
  }
}
