import { Body, Controller, Get, Param, ParseEnumPipe, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { AdminUpdateMatchmakingConfigUseCase } from '../../application/use-cases/admin-update-matchmaking-config.use-case';
import { ListMatchmakingConfigsUseCase } from '../../application/use-cases/list-matchmaking-configs.use-case';
import { RacingMatchmakingConfigKey } from '../../domain/entities/racing-matchmaking-config.entity';
import {
  MatchmakingConfigListResponseDto,
  MatchmakingConfigResponseDto,
} from './dto/matchmaking-config.response.dto';
import { UpdateMatchmakingConfigDto } from './dto/update-matchmaking-config.dto';

// Gestión de los parámetros de matchmaking de la fase online real, de cara
// al backoffice (TASK-323, tarea 8) — antes hardcodeados en
// `compute-rating-changes.ts`/`matchmaking-rating-window.ts`/
// `live-race-room.manager.ts`. Sin create/delete: las tres claves son un
// conjunto cerrado, mismo criterio que `AdminCoinRewardConfigsController`.
@ApiTags('racing-admin')
@Controller('admin/racing/matchmaking-config')
export class AdminMatchmakingConfigController {
  constructor(
    private readonly listConfigs: ListMatchmakingConfigsUseCase,
    private readonly updateConfig: AdminUpdateMatchmakingConfigUseCase,
  ) {}

  @Get()
  @RequiresPermission('racing.matchmaking_config', 'READ')
  @ApiOperation({ summary: 'Listar los parámetros de matchmaking de la fase online' })
  @ApiOkResponse({ type: MatchmakingConfigListResponseDto })
  async list(): Promise<MatchmakingConfigListResponseDto> {
    return MatchmakingConfigListResponseDto.fromDomain(
      await this.listConfigs.execute(),
    );
  }

  @Patch(':key')
  @RequiresPermission('racing.matchmaking_config', 'WRITE')
  @ApiOperation({ summary: 'Ajustar un parámetro de matchmaking' })
  @ApiOkResponse({ type: MatchmakingConfigResponseDto })
  async update(
    @Param('key', new ParseEnumPipe(RacingMatchmakingConfigKey)) key: RacingMatchmakingConfigKey,
    @Body() dto: UpdateMatchmakingConfigDto,
  ): Promise<MatchmakingConfigResponseDto> {
    return MatchmakingConfigResponseDto.fromDomain(
      await this.updateConfig.execute(key, dto.value),
    );
  }
}
