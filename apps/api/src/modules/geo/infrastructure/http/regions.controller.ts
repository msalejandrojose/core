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
import { CreateRegionUseCase } from '../../application/use-cases/create-region.use-case';
import { DeleteRegionUseCase } from '../../application/use-cases/delete-region.use-case';
import { GetRegionUseCase } from '../../application/use-cases/get-region.use-case';
import { ListRegionsUseCase } from '../../application/use-cases/list-regions.use-case';
import { UpdateRegionUseCase } from '../../application/use-cases/update-region.use-case';
import { CreateRegionDto } from './dto/create-region.dto';
import { ListRegionsQueryDto } from './dto/list-regions.query.dto';
import { RegionResponseDto } from './dto/region.response.dto';
import { UpdateRegionDto } from './dto/update-region.dto';

@ApiTags('geo')
@Controller('geo/regions')
export class RegionsController {
  constructor(
    private readonly listRegions: ListRegionsUseCase,
    private readonly getRegion: GetRegionUseCase,
    private readonly createRegion: CreateRegionUseCase,
    private readonly updateRegion: UpdateRegionUseCase,
    private readonly deleteRegion: DeleteRegionUseCase,
  ) {}

  @Get()
  @RequiresPermission('geo.regions', 'READ')
  @ApiOperation({ summary: 'Listar comunidades autónomas (offset paginado).' })
  @ApiPaginatedResponse(RegionResponseDto)
  async list(
    @Query() query: ListRegionsQueryDto,
  ): Promise<PaginatedResponseDto<RegionResponseDto>> {
    const { items, total } = await this.listRegions.execute({
      page: query.page,
      limit: query.limit,
      search: query.search,
      countryId: query.countryId,
    });
    return PaginatedResponseDto.of(
      items.map((e) => RegionResponseDto.fromDomain(e)),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequiresPermission('geo.regions', 'READ')
  @ApiOperation({ summary: 'Obtener una comunidad autónoma.' })
  @ApiOkResponse({ type: RegionResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RegionResponseDto> {
    return RegionResponseDto.fromDomain(await this.getRegion.execute(id));
  }

  @Post()
  @RequiresPermission('geo.regions', 'WRITE')
  @ApiOperation({ summary: 'Crear una comunidad autónoma.' })
  @ApiCreatedResponse({ type: RegionResponseDto })
  async create(@Body() dto: CreateRegionDto): Promise<RegionResponseDto> {
    return RegionResponseDto.fromDomain(await this.createRegion.execute(dto));
  }

  @Patch(':id')
  @RequiresPermission('geo.regions', 'WRITE')
  @ApiOperation({ summary: 'Editar una comunidad autónoma.' })
  @ApiOkResponse({ type: RegionResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRegionDto,
  ): Promise<RegionResponseDto> {
    return RegionResponseDto.fromDomain(
      await this.updateRegion.execute(id, dto),
    );
  }

  @Delete(':id')
  @RequiresPermission('geo.regions', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Borrar una comunidad autónoma (sus provincias quedan sin comunidad).',
  })
  @ApiNoContentResponse()
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteRegion.execute(id);
  }
}
