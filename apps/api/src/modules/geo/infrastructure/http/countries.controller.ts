import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../../shared/http/decorators/api-paginated-response.decorator';
import { PaginatedResponseDto } from '../../../../shared/http/dto/paginated-response.dto';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { CreateCountryUseCase } from '../../application/use-cases/create-country.use-case';
import { DeleteCountryUseCase } from '../../application/use-cases/delete-country.use-case';
import { GetCountryUseCase } from '../../application/use-cases/get-country.use-case';
import { ListCountriesUseCase } from '../../application/use-cases/list-countries.use-case';
import { UpdateCountryUseCase } from '../../application/use-cases/update-country.use-case';
import { CountryResponseDto } from './dto/country.response.dto';
import { CreateCountryDto } from './dto/create-country.dto';
import { ListCountriesQueryDto } from './dto/list-countries.query.dto';
import { UpdateCountryDto } from './dto/update-country.dto';

@ApiTags('geo')
@Controller('geo/countries')
export class CountriesController {
  constructor(
    private readonly listCountries: ListCountriesUseCase,
    private readonly getCountry: GetCountryUseCase,
    private readonly createCountry: CreateCountryUseCase,
    private readonly updateCountry: UpdateCountryUseCase,
    private readonly deleteCountry: DeleteCountryUseCase,
  ) {}

  @Get()
  @RequiresPermission('geo.countries', 'READ')
  @ApiOperation({ summary: 'Listar países (offset paginado).' })
  @ApiPaginatedResponse(CountryResponseDto)
  async list(
    @Query() query: ListCountriesQueryDto,
  ): Promise<PaginatedResponseDto<CountryResponseDto>> {
    const { items, total } = await this.listCountries.execute({
      page: query.page,
      limit: query.limit,
      search: query.search,
      isActive: query.isActive,
    });
    return PaginatedResponseDto.of(
      items.map((e) => CountryResponseDto.fromDomain(e)),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequiresPermission('geo.countries', 'READ')
  @ApiOperation({ summary: 'Obtener un país.' })
  @ApiOkResponse({ type: CountryResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CountryResponseDto> {
    return CountryResponseDto.fromDomain(await this.getCountry.execute(id));
  }

  @Post()
  @RequiresPermission('geo.countries', 'WRITE')
  @ApiOperation({ summary: 'Crear un país.' })
  @ApiCreatedResponse({ type: CountryResponseDto })
  async create(@Body() dto: CreateCountryDto): Promise<CountryResponseDto> {
    return CountryResponseDto.fromDomain(await this.createCountry.execute(dto));
  }

  @Patch(':id')
  @RequiresPermission('geo.countries', 'WRITE')
  @ApiOperation({ summary: 'Editar un país.' })
  @ApiOkResponse({ type: CountryResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCountryDto,
  ): Promise<CountryResponseDto> {
    return CountryResponseDto.fromDomain(
      await this.updateCountry.execute(id, dto),
    );
  }

  @Delete(':id')
  @RequiresPermission('geo.countries', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borrar un país (cascada a sus divisiones).' })
  @ApiNoContentResponse()
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteCountry.execute(id);
  }
}
