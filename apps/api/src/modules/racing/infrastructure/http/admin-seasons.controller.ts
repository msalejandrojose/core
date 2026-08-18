import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { AdminCreateSeasonUseCase } from '../../application/use-cases/admin-create-season.use-case';
import { AdminListSeasonsUseCase } from '../../application/use-cases/admin-list-seasons.use-case';
import { CreateSeasonDto } from './dto/create-season.dto';
import { SeasonResponseDto } from './dto/season.response.dto';

@ApiTags('racing-admin')
@Controller('admin/racing/seasons')
export class AdminSeasonsController {
  constructor(
    private readonly listSeasons: AdminListSeasonsUseCase,
    private readonly createSeason: AdminCreateSeasonUseCase,
  ) {}

  @Get()
  @RequiresPermission('racing.seasons', 'READ')
  @ApiOperation({ summary: 'Listar temporadas, más reciente primero' })
  @ApiOkResponse({ type: [SeasonResponseDto] })
  async list(): Promise<SeasonResponseDto[]> {
    const seasons = await this.listSeasons.execute();
    return seasons.map((season) => SeasonResponseDto.fromDomain(season));
  }

  @Post()
  @RequiresPermission('racing.seasons', 'WRITE')
  @ApiOperation({
    summary: 'Crear una temporada',
    description:
      'Cierra la temporada abierta, si hubiera una, en el instante en que empieza esta — como mucho una abierta a la vez.',
  })
  @ApiCreatedResponse({ type: SeasonResponseDto })
  async create(@Body() dto: CreateSeasonDto): Promise<SeasonResponseDto> {
    const season = await this.createSeason.execute({
      name: dto.name,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
    });
    return SeasonResponseDto.fromDomain(season);
  }
}
