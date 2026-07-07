import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';

// Ports
import { COUNTRY_REPOSITORY } from './application/ports/country-repository.port';
import { REGION_REPOSITORY } from './application/ports/region-repository.port';
import { PROVINCE_REPOSITORY } from './application/ports/province-repository.port';
import { MUNICIPALITY_REPOSITORY } from './application/ports/municipality-repository.port';
import { POSTAL_CODE_REPOSITORY } from './application/ports/postal-code-repository.port';

// Adapters (persistence)
import { PrismaCountryRepository } from './infrastructure/persistence/prisma-country.repository';
import { PrismaRegionRepository } from './infrastructure/persistence/prisma-region.repository';
import { PrismaProvinceRepository } from './infrastructure/persistence/prisma-province.repository';
import { PrismaMunicipalityRepository } from './infrastructure/persistence/prisma-municipality.repository';
import { PrismaPostalCodeRepository } from './infrastructure/persistence/prisma-postal-code.repository';

// Use cases — countries
import { CreateCountryUseCase } from './application/use-cases/create-country.use-case';
import { UpdateCountryUseCase } from './application/use-cases/update-country.use-case';
import { DeleteCountryUseCase } from './application/use-cases/delete-country.use-case';
import { GetCountryUseCase } from './application/use-cases/get-country.use-case';
import { ListCountriesUseCase } from './application/use-cases/list-countries.use-case';
// Use cases — regions
import { CreateRegionUseCase } from './application/use-cases/create-region.use-case';
import { UpdateRegionUseCase } from './application/use-cases/update-region.use-case';
import { DeleteRegionUseCase } from './application/use-cases/delete-region.use-case';
import { GetRegionUseCase } from './application/use-cases/get-region.use-case';
import { ListRegionsUseCase } from './application/use-cases/list-regions.use-case';
// Use cases — provinces
import { CreateProvinceUseCase } from './application/use-cases/create-province.use-case';
import { UpdateProvinceUseCase } from './application/use-cases/update-province.use-case';
import { DeleteProvinceUseCase } from './application/use-cases/delete-province.use-case';
import { GetProvinceUseCase } from './application/use-cases/get-province.use-case';
import { ListProvincesUseCase } from './application/use-cases/list-provinces.use-case';
// Use cases — municipalities
import { CreateMunicipalityUseCase } from './application/use-cases/create-municipality.use-case';
import { UpdateMunicipalityUseCase } from './application/use-cases/update-municipality.use-case';
import { DeleteMunicipalityUseCase } from './application/use-cases/delete-municipality.use-case';
import { GetMunicipalityUseCase } from './application/use-cases/get-municipality.use-case';
import { ListMunicipalitiesUseCase } from './application/use-cases/list-municipalities.use-case';
// Use cases — postal codes
import { CreatePostalCodeUseCase } from './application/use-cases/create-postal-code.use-case';
import { UpdatePostalCodeUseCase } from './application/use-cases/update-postal-code.use-case';
import { DeletePostalCodeUseCase } from './application/use-cases/delete-postal-code.use-case';
import { GetPostalCodeUseCase } from './application/use-cases/get-postal-code.use-case';
import { ListPostalCodesUseCase } from './application/use-cases/list-postal-codes.use-case';

// HTTP
import { CountriesController } from './infrastructure/http/countries.controller';
import { RegionsController } from './infrastructure/http/regions.controller';
import { ProvincesController } from './infrastructure/http/provinces.controller';
import { MunicipalitiesController } from './infrastructure/http/municipalities.controller';
import { PostalCodesController } from './infrastructure/http/postal-codes.controller';

/**
 * Módulo de localización / geografía. Expone el CRUD de la jerarquía
 * administrativa (país → comunidad autónoma → provincia → municipio → código
 * postal) bajo `/geo/*`. Importa `IamModule` por los guards de
 * `@RequiresPermission`.
 */
@Module({
  imports: [IamModule],
  controllers: [
    CountriesController,
    RegionsController,
    ProvincesController,
    MunicipalitiesController,
    PostalCodesController,
  ],
  providers: [
    { provide: COUNTRY_REPOSITORY, useClass: PrismaCountryRepository },
    { provide: REGION_REPOSITORY, useClass: PrismaRegionRepository },
    { provide: PROVINCE_REPOSITORY, useClass: PrismaProvinceRepository },
    {
      provide: MUNICIPALITY_REPOSITORY,
      useClass: PrismaMunicipalityRepository,
    },
    { provide: POSTAL_CODE_REPOSITORY, useClass: PrismaPostalCodeRepository },

    CreateCountryUseCase,
    UpdateCountryUseCase,
    DeleteCountryUseCase,
    GetCountryUseCase,
    ListCountriesUseCase,

    CreateRegionUseCase,
    UpdateRegionUseCase,
    DeleteRegionUseCase,
    GetRegionUseCase,
    ListRegionsUseCase,

    CreateProvinceUseCase,
    UpdateProvinceUseCase,
    DeleteProvinceUseCase,
    GetProvinceUseCase,
    ListProvincesUseCase,

    CreateMunicipalityUseCase,
    UpdateMunicipalityUseCase,
    DeleteMunicipalityUseCase,
    GetMunicipalityUseCase,
    ListMunicipalitiesUseCase,

    CreatePostalCodeUseCase,
    UpdatePostalCodeUseCase,
    DeletePostalCodeUseCase,
    GetPostalCodeUseCase,
    ListPostalCodesUseCase,
  ],
})
export class GeoModule {}
