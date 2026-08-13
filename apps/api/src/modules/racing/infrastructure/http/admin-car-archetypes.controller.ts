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
import { AdminCreateCarArchetypeUseCase } from '../../application/use-cases/admin-create-car-archetype.use-case';
import { AdminGetCarArchetypeUseCase } from '../../application/use-cases/admin-get-car-archetype.use-case';
import { AdminListCarArchetypesUseCase } from '../../application/use-cases/admin-list-car-archetypes.use-case';
import { AdminUpdateCarArchetypeUseCase } from '../../application/use-cases/admin-update-car-archetype.use-case';
import { CarArchetypeResponseDto } from './dto/car-archetype.response.dto';
import { CreateCarArchetypeDto } from './dto/create-car-archetype.dto';
import { ListAdminCarArchetypesQueryDto } from './dto/list-admin-car-archetypes.query.dto';
import { UpdateCarArchetypeDto } from './dto/update-car-archetype.dto';

// Gestión del catálogo, de cara al backoffice — separado de
// CarLoadoutController, que es de cara al jugador (TASK-266).
@ApiTags('racing-admin')
@Controller('admin/racing/car-archetypes')
export class AdminCarArchetypesController {
  constructor(
    private readonly listArchetypes: AdminListCarArchetypesUseCase,
    private readonly getArchetype: AdminGetCarArchetypeUseCase,
    private readonly createArchetype: AdminCreateCarArchetypeUseCase,
    private readonly updateArchetype: AdminUpdateCarArchetypeUseCase,
  ) {}

  @Get()
  @RequiresPermission('racing.cars', 'READ')
  @ApiOperation({ summary: 'Listar arquetipos (activos e inactivos)' })
  @ApiPaginatedResponse(CarArchetypeResponseDto)
  async list(
    @Query() query: ListAdminCarArchetypesQueryDto,
  ): Promise<PaginatedResponseDto<CarArchetypeResponseDto>> {
    const { items, total } = await this.listArchetypes.execute({
      page: query.page,
      limit: query.limit,
      search: query.search,
    });
    return PaginatedResponseDto.of(
      items.map((a) => CarArchetypeResponseDto.fromDomain(a)),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequiresPermission('racing.cars', 'READ')
  @ApiOperation({ summary: 'Arquetipo por id' })
  @ApiOkResponse({ type: CarArchetypeResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CarArchetypeResponseDto> {
    return CarArchetypeResponseDto.fromDomain(
      await this.getArchetype.execute(id),
    );
  }

  @Post()
  @RequiresPermission('racing.cars', 'WRITE')
  @ApiOperation({ summary: 'Crear un arquetipo' })
  @ApiCreatedResponse({ type: CarArchetypeResponseDto })
  async create(
    @Body() dto: CreateCarArchetypeDto,
  ): Promise<CarArchetypeResponseDto> {
    return CarArchetypeResponseDto.fromDomain(
      await this.createArchetype.execute(dto),
    );
  }

  @Patch(':id')
  @RequiresPermission('racing.cars', 'WRITE')
  @ApiOperation({
    summary: 'Editar un arquetipo',
    description: 'También activa/desactiva vía isActive, mismo endpoint.',
  })
  @ApiOkResponse({ type: CarArchetypeResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCarArchetypeDto,
  ): Promise<CarArchetypeResponseDto> {
    return CarArchetypeResponseDto.fromDomain(
      await this.updateArchetype.execute(id, dto),
    );
  }
}
