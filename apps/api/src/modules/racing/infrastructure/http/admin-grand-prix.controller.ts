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
import { AdminCreateGrandPrixUseCase } from '../../application/use-cases/admin-create-grand-prix.use-case';
import { AdminGetGrandPrixUseCase } from '../../application/use-cases/admin-get-grand-prix.use-case';
import { AdminListGrandPrixUseCase } from '../../application/use-cases/admin-list-grand-prix.use-case';
import { AdminUpdateGrandPrixUseCase } from '../../application/use-cases/admin-update-grand-prix.use-case';
import { CreateGrandPrixDto } from './dto/create-grand-prix.dto';
import { GrandPrixResponseDto } from './dto/grand-prix.response.dto';
import { ListAdminGrandPrixQueryDto } from './dto/list-admin-grand-prix.query.dto';
import { UpdateGrandPrixDto } from './dto/update-grand-prix.dto';

// Gestión del catálogo, de cara al backoffice — separado de
// GrandPrixController, que es de cara al jugador.
@ApiTags('racing-admin')
@Controller('admin/racing/grand-prix')
export class AdminGrandPrixController {
  constructor(
    private readonly listGrandPrix: AdminListGrandPrixUseCase,
    private readonly getGrandPrix: AdminGetGrandPrixUseCase,
    private readonly createGrandPrix: AdminCreateGrandPrixUseCase,
    private readonly updateGrandPrix: AdminUpdateGrandPrixUseCase,
  ) {}

  @Get()
  @RequiresPermission('racing.grand_prix', 'READ')
  @ApiOperation({ summary: 'Listar Grand Prix (activos e inactivos)' })
  @ApiPaginatedResponse(GrandPrixResponseDto)
  async list(
    @Query() query: ListAdminGrandPrixQueryDto,
  ): Promise<PaginatedResponseDto<GrandPrixResponseDto>> {
    const { items, total } = await this.listGrandPrix.execute({
      page: query.page,
      limit: query.limit,
      search: query.search,
    });
    return PaginatedResponseDto.of(
      items.map((item) => GrandPrixResponseDto.fromDomain(item)),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequiresPermission('racing.grand_prix', 'READ')
  @ApiOperation({ summary: 'Grand Prix por id' })
  @ApiOkResponse({ type: GrandPrixResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GrandPrixResponseDto> {
    return GrandPrixResponseDto.fromDomain(await this.getGrandPrix.execute(id));
  }

  @Post()
  @RequiresPermission('racing.grand_prix', 'WRITE')
  @ApiOperation({ summary: 'Crear un Grand Prix' })
  @ApiCreatedResponse({ type: GrandPrixResponseDto })
  async create(@Body() dto: CreateGrandPrixDto): Promise<GrandPrixResponseDto> {
    return GrandPrixResponseDto.fromDomain(
      await this.createGrandPrix.execute(dto),
    );
  }

  @Patch(':id')
  @RequiresPermission('racing.grand_prix', 'WRITE')
  @ApiOperation({
    summary: 'Editar un Grand Prix',
    description:
      'También activa/desactiva vía isActive, y sustituye la lista de circuitos vía trackIds — mismo endpoint.',
  })
  @ApiOkResponse({ type: GrandPrixResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGrandPrixDto,
  ): Promise<GrandPrixResponseDto> {
    return GrandPrixResponseDto.fromDomain(
      await this.updateGrandPrix.execute(id, dto),
    );
  }
}
