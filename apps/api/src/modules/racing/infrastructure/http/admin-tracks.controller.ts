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
import { FileViewTokenService } from '../../../storage/infrastructure/http/file-view-token.service';
import { AdminCreateTrackUseCase } from '../../application/use-cases/admin-create-track.use-case';
import { AdminGetTrackUseCase } from '../../application/use-cases/admin-get-track.use-case';
import { AdminListTracksUseCase } from '../../application/use-cases/admin-list-tracks.use-case';
import { AdminUpdateTrackUseCase } from '../../application/use-cases/admin-update-track.use-case';
import { AdminTrackResponseDto } from './dto/admin-track.response.dto';
import { CreateTrackDto } from './dto/create-track.dto';
import { ListAdminTracksQueryDto } from './dto/list-admin-tracks.query.dto';
import { UpdateTrackDto } from './dto/update-track.dto';

// Endpoints de backoffice para gestionar circuitos completos, separados de
// GET /racing/tracks (RacingController), que es de solo lectura, solo
// circuitos activos, y de cara al jugador (TASK-242).
@ApiTags('racing-admin')
@Controller('admin/racing/tracks')
export class AdminTracksController {
  constructor(
    private readonly listTracks: AdminListTracksUseCase,
    private readonly getTrack: AdminGetTrackUseCase,
    private readonly createTrack: AdminCreateTrackUseCase,
    private readonly updateTrack: AdminUpdateTrackUseCase,
    private readonly viewTokens: FileViewTokenService,
  ) {}

  @Get()
  @RequiresPermission('racing.tracks', 'READ')
  @ApiOperation({ summary: 'Listar circuitos (activos e inactivos)' })
  @ApiPaginatedResponse(AdminTrackResponseDto)
  async list(
    @Query() query: ListAdminTracksQueryDto,
  ): Promise<PaginatedResponseDto<AdminTrackResponseDto>> {
    const { items, total } = await this.listTracks.execute({
      page: query.page,
      limit: query.limit,
      search: query.search,
    });
    return PaginatedResponseDto.of(
      items.map((track) =>
        AdminTrackResponseDto.fromTrack(track, this.imageUrl(track.imageId)),
      ),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequiresPermission('racing.tracks', 'READ')
  @ApiOperation({ summary: 'Circuito por id, con su trazado completo' })
  @ApiOkResponse({ type: AdminTrackResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminTrackResponseDto> {
    const track = await this.getTrack.execute(id);
    return AdminTrackResponseDto.fromTrack(track, this.imageUrl(track.imageId));
  }

  @Post()
  @RequiresPermission('racing.tracks', 'WRITE')
  @ApiOperation({ summary: 'Crear un circuito con su trazado' })
  @ApiCreatedResponse({ type: AdminTrackResponseDto })
  async create(@Body() dto: CreateTrackDto): Promise<AdminTrackResponseDto> {
    const track = await this.createTrack.execute({
      slug: dto.slug,
      name: dto.name,
      sectorCount: dto.sectorCount,
      minPlausibleMs: dto.minPlausibleMs,
      path: dto.path,
      theme: dto.theme,
      grip: dto.grip,
      isActive: dto.isActive,
      imageId: dto.imageId,
    });
    return AdminTrackResponseDto.fromTrack(track, this.imageUrl(track.imageId));
  }

  @Patch(':id')
  @RequiresPermission('racing.tracks', 'WRITE')
  @ApiOperation({
    summary: 'Editar un circuito',
    description:
      'También activa/desactiva (campo isActive) sin perder su histórico de tiempos.',
  })
  @ApiOkResponse({ type: AdminTrackResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTrackDto,
  ): Promise<AdminTrackResponseDto> {
    const track = await this.updateTrack.execute(id, {
      name: dto.name,
      sectorCount: dto.sectorCount,
      minPlausibleMs: dto.minPlausibleMs,
      path: dto.path,
      theme: dto.theme,
      grip: dto.grip,
      isActive: dto.isActive,
      imageId: dto.imageId,
    });
    return AdminTrackResponseDto.fromTrack(track, this.imageUrl(track.imageId));
  }

  // Ver el comentario homólogo en `RacingController`.
  private imageUrl(imageId: string | null): string | null {
    return imageId
      ? `/files/view?token=${this.viewTokens.issue(imageId)}`
      : null;
  }
}
