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
import { CreateProvinceUseCase } from '../../application/use-cases/create-province.use-case';
import { DeleteProvinceUseCase } from '../../application/use-cases/delete-province.use-case';
import { GetProvinceUseCase } from '../../application/use-cases/get-province.use-case';
import { ListProvincesUseCase } from '../../application/use-cases/list-provinces.use-case';
import { UpdateProvinceUseCase } from '../../application/use-cases/update-province.use-case';
import { CreateProvinceDto } from './dto/create-province.dto';
import { ListProvincesQueryDto } from './dto/list-provinces.query.dto';
import { ProvinceResponseDto } from './dto/province.response.dto';
import { UpdateProvinceDto } from './dto/update-province.dto';

@ApiTags('geo')
@Controller('geo/provinces')
export class ProvincesController {
  constructor(
    private readonly listProvinces: ListProvincesUseCase,
    private readonly getProvince: GetProvinceUseCase,
    private readonly createProvince: CreateProvinceUseCase,
    private readonly updateProvince: UpdateProvinceUseCase,
    private readonly deleteProvince: DeleteProvinceUseCase,
  ) {}

  @Get()
  @RequiresPermission('geo.provinces', 'READ')
  @ApiOperation({ summary: 'Listar provincias (offset paginado).' })
  @ApiPaginatedResponse(ProvinceResponseDto)
  async list(
    @Query() query: ListProvincesQueryDto,
  ): Promise<PaginatedResponseDto<ProvinceResponseDto>> {
    const { items, total } = await this.listProvinces.execute({
      page: query.page,
      limit: query.limit,
      search: query.search,
      countryId: query.countryId,
      regionId: query.regionId,
    });
    return PaginatedResponseDto.of(
      items.map((e) => ProvinceResponseDto.fromDomain(e)),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequiresPermission('geo.provinces', 'READ')
  @ApiOperation({ summary: 'Obtener una provincia.' })
  @ApiOkResponse({ type: ProvinceResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProvinceResponseDto> {
    return ProvinceResponseDto.fromDomain(await this.getProvince.execute(id));
  }

  @Post()
  @RequiresPermission('geo.provinces', 'WRITE')
  @ApiOperation({ summary: 'Crear una provincia.' })
  @ApiCreatedResponse({ type: ProvinceResponseDto })
  async create(@Body() dto: CreateProvinceDto): Promise<ProvinceResponseDto> {
    return ProvinceResponseDto.fromDomain(
      await this.createProvince.execute(dto),
    );
  }

  @Patch(':id')
  @RequiresPermission('geo.provinces', 'WRITE')
  @ApiOperation({ summary: 'Editar una provincia.' })
  @ApiOkResponse({ type: ProvinceResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProvinceDto,
  ): Promise<ProvinceResponseDto> {
    return ProvinceResponseDto.fromDomain(
      await this.updateProvince.execute(id, dto),
    );
  }

  @Delete(':id')
  @RequiresPermission('geo.provinces', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Borrar una provincia (cascada a municipios y CPs).',
  })
  @ApiNoContentResponse()
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteProvince.execute(id);
  }
}
