import { Body, Controller, Get, Param, ParseEnumPipe, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { AdminUpdateCoinRewardConfigUseCase } from '../../application/use-cases/admin-update-coin-reward-config.use-case';
import { ListCoinRewardConfigsUseCase } from '../../application/use-cases/list-coin-reward-configs.use-case';
import { RacingCoinRewardKey } from '../../domain/entities/racing-coin-reward-config.entity';
import {
  CoinRewardConfigListResponseDto,
  CoinRewardConfigResponseDto,
} from './dto/coin-reward-config.response.dto';
import { UpdateCoinRewardConfigDto } from './dto/update-coin-reward-config.dto';

// Gestión de los importes de la economía de monedas, de cara al backoffice
// (TASK-322) — antes hardcodeados en `racing-coin-rewards.ts`. Sin
// create/delete: las nueve claves son un conjunto cerrado (ver el modelo en
// schema.prisma), mismo criterio que `AdminTerrainEffectsController`.
@ApiTags('racing-admin')
@Controller('admin/racing/coin-rewards')
export class AdminCoinRewardConfigsController {
  constructor(
    private readonly listConfigs: ListCoinRewardConfigsUseCase,
    private readonly updateConfig: AdminUpdateCoinRewardConfigUseCase,
  ) {}

  @Get()
  @RequiresPermission('racing.coin_rewards', 'READ')
  @ApiOperation({ summary: 'Listar los importes de la economía de monedas' })
  @ApiOkResponse({ type: CoinRewardConfigListResponseDto })
  async list(): Promise<CoinRewardConfigListResponseDto> {
    return CoinRewardConfigListResponseDto.fromDomain(
      await this.listConfigs.execute(),
    );
  }

  @Patch(':key')
  @RequiresPermission('racing.coin_rewards', 'WRITE')
  @ApiOperation({ summary: 'Ajustar el importe de un bono (0 lo desactiva)' })
  @ApiOkResponse({ type: CoinRewardConfigResponseDto })
  async update(
    @Param('key', new ParseEnumPipe(RacingCoinRewardKey)) key: RacingCoinRewardKey,
    @Body() dto: UpdateCoinRewardConfigDto,
  ): Promise<CoinRewardConfigResponseDto> {
    return CoinRewardConfigResponseDto.fromDomain(
      await this.updateConfig.execute(key, dto.amount),
    );
  }
}
