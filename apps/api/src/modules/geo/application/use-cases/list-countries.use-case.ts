import { Inject, Injectable } from '@nestjs/common';
import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Country } from '../../domain/entities/country.entity';
import {
  COUNTRY_REPOSITORY,
  type CountryRepositoryPort,
  type ListCountriesOptions,
} from '../ports/country-repository.port';

@Injectable()
export class ListCountriesUseCase {
  constructor(
    @Inject(COUNTRY_REPOSITORY)
    private readonly countries: CountryRepositoryPort,
  ) {}

  execute(opts: ListCountriesOptions): Promise<PaginatedResult<Country>> {
    return this.countries.list(opts);
  }
}
