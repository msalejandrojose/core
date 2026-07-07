import { Country as CountryRow } from '../../../../generated/prisma/client';
import { Country } from '../../domain/entities/country.entity';

export class CountryMapper {
  static toDomain(row: CountryRow): Country {
    return {
      id: row.id,
      iso2: row.iso2,
      iso3: row.iso3,
      numericCode: row.numericCode,
      name: row.name,
      nativeName: row.nativeName,
      phoneCode: row.phoneCode,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
