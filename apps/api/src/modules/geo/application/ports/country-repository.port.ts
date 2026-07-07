import { PaginatedResult } from '../../../../shared/types/paginated-result';
import { Country } from '../../domain/entities/country.entity';

export const COUNTRY_REPOSITORY = Symbol('GEO_COUNTRY_REPOSITORY');

export interface CreateCountryData {
  iso2: string;
  iso3: string;
  numericCode: string | null;
  name: string;
  nativeName: string | null;
  phoneCode: string | null;
  isActive: boolean;
}

export interface UpdateCountryPatch {
  iso2?: string;
  iso3?: string;
  numericCode?: string | null;
  name?: string;
  nativeName?: string | null;
  phoneCode?: string | null;
  isActive?: boolean;
}

export interface ListCountriesOptions {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
}

export interface CountryRepositoryPort {
  create(data: CreateCountryData): Promise<Country>;
  update(id: string, patch: UpdateCountryPatch): Promise<Country>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Country | null>;
  // Comprueba si ya existe un país con ese iso2 o iso3 (opcionalmente excluyendo uno).
  existsIso(iso2: string, iso3: string, exceptId?: string): Promise<boolean>;
  list(opts: ListCountriesOptions): Promise<PaginatedResult<Country>>;
}
