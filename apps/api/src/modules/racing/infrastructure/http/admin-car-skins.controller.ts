import {
  Body,
  Controller,
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
import { AdminCreateCarSkinUseCase } from '../../application/use-cases/admin-create-car-skin.use-case';
import { AdminGetCarSkinUseCase } from '../../application/use-cases/admin-get-car-skin.use-case';
import { AdminGrantCarSkinUseCase } from '../../application/use-cases/admin-grant-car-skin.use-case';
import { AdminListCarSkinsUseCase } from '../../application/use-cases/admin-list-car-skins.use-case';
import { AdminUpdateCarSkinUseCase } from '../../application/use-cases/admin-update-car-skin.use-case';
import { CarSkinResponseDto } from './dto/car-skin.response.dto';
import { CreateCarSkinDto } from './dto/create-car-skin.dto';
import { GrantCarSkinDto } from './dto/grant-car-skin.dto';
import { ListAdminCarSkinsQueryDto } from './dto/list-admin-car-skins.query.dto';
import { UpdateCarSkinDto } from './dto/update-car-skin.dto';

@ApiTags('racing-admin')
@Controller('admin/racing/car-skins')
export class AdminCarSkinsController {
  constructor(
    private readonly listSkins: AdminListCarSkinsUseCase,
    private readonly getSkin: AdminGetCarSkinUseCase,
    private readonly createSkin: AdminCreateCarSkinUseCase,
    private readonly updateSkin: AdminUpdateCarSkinUseCase,
    private readonly grantSkin: AdminGrantCarSkinUseCase,
  ) {}

  @Get()
  @RequiresPermission('racing.cars', 'READ')
  @ApiOperation({ summary: 'Listar skins (activos e inactivos)' })
  @ApiPaginatedResponse(CarSkinResponseDto)
  async list(
    @Query() query: ListAdminCarSkinsQueryDto,
  ): Promise<PaginatedResponseDto<CarSkinResponseDto>> {
    const { items, total } = await this.listSkins.execute({
      page: query.page,
      limit: query.limit,
      search: query.search,
    });
    return PaginatedResponseDto.of(
      items.map((s) => CarSkinResponseDto.fromDomain(s)),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequiresPermission('racing.cars', 'READ')
  @ApiOperation({ summary: 'Skin por id' })
  @ApiOkResponse({ type: CarSkinResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CarSkinResponseDto> {
    return CarSkinResponseDto.fromDomain(await this.getSkin.execute(id));
  }

  @Post()
  @RequiresPermission('racing.cars', 'WRITE')
  @ApiOperation({ summary: 'Crear un skin' })
  @ApiCreatedResponse({ type: CarSkinResponseDto })
  async create(@Body() dto: CreateCarSkinDto): Promise<CarSkinResponseDto> {
    return CarSkinResponseDto.fromDomain(await this.createSkin.execute(dto));
  }

  @Patch(':id')
  @RequiresPermission('racing.cars', 'WRITE')
  @ApiOperation({
    summary: 'Editar un skin',
    description: 'También activa/desactiva vía isActive, mismo endpoint.',
  })
  @ApiOkResponse({ type: CarSkinResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCarSkinDto,
  ): Promise<CarSkinResponseDto> {
    return CarSkinResponseDto.fromDomain(
      await this.updateSkin.execute(id, dto),
    );
  }

  @Post('players/:userId/grant')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequiresPermission('racing.cars', 'WRITE')
  @ApiOperation({
    summary: 'Conceder la propiedad de un skin a un jugador',
    description:
      'A mano desde el backoffice — sin pagos ni recompensas automáticas todavía. Idempotente.',
  })
  @ApiNoContentResponse()
  async grant(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: GrantCarSkinDto,
  ): Promise<void> {
    await this.grantSkin.execute(userId, dto.skinId);
  }
}
