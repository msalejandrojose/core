import { Body, Controller, Get, Param, ParseEnumPipe, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { AdminUpdateLeagueConfigUseCase } from '../../application/use-cases/admin-update-league-config.use-case';
import { ListLeagueConfigsUseCase } from '../../application/use-cases/list-league-configs.use-case';
import { RacingLeagueConfigKey } from '../../domain/entities/racing-league-config.entity';
import {
  LeagueConfigListResponseDto,
  LeagueConfigResponseDto,
} from './dto/league-config.response.dto';
import { UpdateLeagueConfigDto } from './dto/update-league-config.dto';

// Gestión de los puntos por posición y los umbrales de ascenso/descenso de
// las ligas por temporada (TASK-291) — mismo criterio de "conjunto cerrado
// sin create/delete" que `AdminCoinRewardConfigsController`.
@ApiTags('racing-admin')
@Controller('admin/racing/league-config')
export class AdminLeagueConfigsController {
  constructor(
    private readonly listConfigs: ListLeagueConfigsUseCase,
    private readonly updateConfig: AdminUpdateLeagueConfigUseCase,
  ) {}

  @Get()
  @RequiresPermission('racing.league_config', 'READ')
  @ApiOperation({ summary: 'Listar los puntos y umbrales de liga' })
  @ApiOkResponse({ type: LeagueConfigListResponseDto })
  async list(): Promise<LeagueConfigListResponseDto> {
    return LeagueConfigListResponseDto.fromDomain(
      await this.listConfigs.execute(),
    );
  }

  @Patch(':key')
  @RequiresPermission('racing.league_config', 'WRITE')
  @ApiOperation({ summary: 'Ajustar un punto por posición o un umbral de liga' })
  @ApiOkResponse({ type: LeagueConfigResponseDto })
  async update(
    @Param('key', new ParseEnumPipe(RacingLeagueConfigKey)) key: RacingLeagueConfigKey,
    @Body() dto: UpdateLeagueConfigDto,
  ): Promise<LeagueConfigResponseDto> {
    return LeagueConfigResponseDto.fromDomain(
      await this.updateConfig.execute(key, dto.value),
    );
  }
}
