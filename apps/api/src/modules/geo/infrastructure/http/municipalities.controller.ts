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
import { CreateMunicipalityUseCase } from '../../application/use-cases/create-municipality.use-case';
import { DeleteMunicipalityUseCase } from '../../application/use-cases/delete-municipality.use-case';
import { GetMunicipalityUseCase } from '../../application/use-cases/get-municipality.use-case';
import { ListMunicipalitiesUseCase } from '../../application/use-cases/list-municipalities.use-case';
import { UpdateMunicipalityUseCase } from '../../application/use-cases/update-municipality.use-case';
import { CreateMunicipalityDto } from './dto/create-municipality.dto';
import { ListMunicipalitiesQueryDto } from './dto/list-municipalities.query.dto';
import { MunicipalityResponseDto } from './dto/municipality.response.dto';
import { UpdateMunicipalityDto } from './dto/update-municipality.dto';

@ApiTags('geo')
@Controller('geo/municipalities')
export class MunicipalitiesController {
  constructor(
    private readonly listMunicipalities: ListMunicipalitiesUseCase,
    private readonly getMunicipality: GetMunicipalityUseCase,
    private readonly createMunicipality: CreateMunicipalityUseCase,
    private readonly updateMunicipality: UpdateMunicipalityUseCase,
    private readonly deleteMunicipality: DeleteMunicipalityUseCase,
  ) {}

  @Get()
  @RequiresPermission('geo.municipalities', 'READ')
  @ApiOperation({ summary: 'Listar municipios (offset paginado).' })
  @ApiPaginatedResponse(MunicipalityResponseDto)
  async list(
    @Query() query: ListMunicipalitiesQueryDto,
  ): Promise<PaginatedResponseDto<MunicipalityResponseDto>> {
    const { items, total } = await this.listMunicipalities.execute({
      page: query.page,
      limit: query.limit,
      search: query.search,
      provinceId: query.provinceId,
    });
    return PaginatedResponseDto.of(
      items.map((e) => MunicipalityResponseDto.fromDomain(e)),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequiresPermission('geo.municipalities', 'READ')
  @ApiOperation({ summary: 'Obtener un municipio.' })
  @ApiOkResponse({ type: MunicipalityResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MunicipalityResponseDto> {
    return MunicipalityResponseDto.fromDomain(
      await this.getMunicipality.execute(id),
    );
  }

  @Post()
  @RequiresPermission('geo.municipalities', 'WRITE')
  @ApiOperation({ summary: 'Crear un municipio.' })
  @ApiCreatedResponse({ type: MunicipalityResponseDto })
  async create(
    @Body() dto: CreateMunicipalityDto,
  ): Promise<MunicipalityResponseDto> {
    return MunicipalityResponseDto.fromDomain(
      await this.createMunicipality.execute(dto),
    );
  }

  @Patch(':id')
  @RequiresPermission('geo.municipalities', 'WRITE')
  @ApiOperation({ summary: 'Editar un municipio.' })
  @ApiOkResponse({ type: MunicipalityResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMunicipalityDto,
  ): Promise<MunicipalityResponseDto> {
    return MunicipalityResponseDto.fromDomain(
      await this.updateMunicipality.execute(id, dto),
    );
  }

  @Delete(':id')
  @RequiresPermission('geo.municipalities', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Borrar un municipio (cascada a sus códigos postales).',
  })
  @ApiNoContentResponse()
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteMunicipality.execute(id);
  }
}
