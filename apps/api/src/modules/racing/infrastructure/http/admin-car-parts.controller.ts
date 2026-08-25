import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../../shared/http/decorators/api-paginated-response.decorator';
import { PaginatedResponseDto } from '../../../../shared/http/dto/paginated-response.dto';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { AdminCreateCarPartUseCase } from '../../application/use-cases/admin-create-car-part.use-case';
import { AdminGetCarPartUseCase } from '../../application/use-cases/admin-get-car-part.use-case';
import { AdminListCarPartsUseCase } from '../../application/use-cases/admin-list-car-parts.use-case';
import { AdminUpdateCarPartUseCase } from '../../application/use-cases/admin-update-car-part.use-case';
import { CarPartResponseDto } from './dto/car-part.response.dto';
import { CreateCarPartDto } from './dto/create-car-part.dto';
import { ListAdminCarPartsQueryDto } from './dto/list-admin-car-parts.query.dto';
import { UpdateCarPartDto } from './dto/update-car-part.dto';

@ApiTags('racing-admin')
@Controller('admin/racing/car-parts')
export class AdminCarPartsController {
  constructor(
    private readonly listParts: AdminListCarPartsUseCase,
    private readonly getPart: AdminGetCarPartUseCase,
    private readonly createPart: AdminCreateCarPartUseCase,
    private readonly updatePart: AdminUpdateCarPartUseCase,
  ) {}

  @Get()
  @RequiresPermission('racing.cars', 'READ')
  @ApiOperation({ summary: 'Listar piezas (activas e inactivas)' })
  @ApiPaginatedResponse(CarPartResponseDto)
  async list(
    @Query() query: ListAdminCarPartsQueryDto,
  ): Promise<PaginatedResponseDto<CarPartResponseDto>> {
    const { items, total } = await this.listParts.execute({
      page: query.page,
      limit: query.limit,
      search: query.search,
      category: query.category,
    });
    return PaginatedResponseDto.of(
      items.map((p) => CarPartResponseDto.fromDomain(p)),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequiresPermission('racing.cars', 'READ')
  @ApiOperation({ summary: 'Pieza por id' })
  @ApiOkResponse({ type: CarPartResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CarPartResponseDto> {
    return CarPartResponseDto.fromDomain(await this.getPart.execute(id));
  }

  @Post()
  @RequiresPermission('racing.cars', 'WRITE')
  @ApiOperation({ summary: 'Crear una pieza' })
  @ApiCreatedResponse({ type: CarPartResponseDto })
  async create(@Body() dto: CreateCarPartDto): Promise<CarPartResponseDto> {
    return CarPartResponseDto.fromDomain(await this.createPart.execute(dto));
  }

  @Patch(':id')
  @RequiresPermission('racing.cars', 'WRITE')
  @ApiOperation({
    summary: 'Editar una pieza',
    description: 'También activa/desactiva vía isActive, mismo endpoint.',
  })
  @ApiOkResponse({ type: CarPartResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCarPartDto,
  ): Promise<CarPartResponseDto> {
    return CarPartResponseDto.fromDomain(
      await this.updatePart.execute(id, dto),
    );
  }
}
