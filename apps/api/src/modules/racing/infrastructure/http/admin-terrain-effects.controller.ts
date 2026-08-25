import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { AdminUpdateTerrainEffectUseCase } from '../../application/use-cases/admin-update-terrain-effect.use-case';
import { ListTerrainEffectsUseCase } from '../../application/use-cases/list-terrain-effects.use-case';
import { TerrainType } from '../../domain/track-terrain';
import {
  TerrainEffectListResponseDto,
  TerrainEffectResponseDto,
} from './dto/terrain-effect.response.dto';
import { UpdateTerrainEffectDto } from './dto/update-terrain-effect.dto';

// Gestión de los factores, de cara al backoffice (TASK-304) — separado de
// TerrainEffectsController, que es de cara al jugador. Sin create/delete:
// los cuatro tipos son un conjunto cerrado (ver el modelo en schema.prisma).
@ApiTags('racing-admin')
@Controller('admin/racing/terrain-effects')
export class AdminTerrainEffectsController {
  constructor(
    private readonly listEffects: ListTerrainEffectsUseCase,
    private readonly updateEffect: AdminUpdateTerrainEffectUseCase,
  ) {}

  @Get()
  @RequiresPermission('racing.terrain', 'READ')
  @ApiOperation({ summary: 'Listar los factores de terreno de sección' })
  @ApiOkResponse({ type: TerrainEffectListResponseDto })
  async list(): Promise<TerrainEffectListResponseDto> {
    return TerrainEffectListResponseDto.fromDomain(
      await this.listEffects.execute(),
    );
  }

  @Patch(':type')
  @RequiresPermission('racing.terrain', 'WRITE')
  @ApiOperation({ summary: 'Ajustar el grip / si frena la velocidad punta' })
  @ApiOkResponse({ type: TerrainEffectResponseDto })
  async update(
    @Param('type', new ParseEnumPipe(TerrainType)) type: TerrainType,
    @Body() dto: UpdateTerrainEffectDto,
  ): Promise<TerrainEffectResponseDto> {
    return TerrainEffectResponseDto.fromDomain(
      await this.updateEffect.execute(type, dto),
    );
  }
}
