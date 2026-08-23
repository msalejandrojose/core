import { Body, Controller, Get, Param, ParseEnumPipe, Patch } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { AdminUpdateCircuitRotationConfigUseCase } from '../../application/use-cases/admin-update-circuit-rotation-config.use-case';
import { ListCircuitRotationConfigsUseCase } from '../../application/use-cases/list-circuit-rotation-configs.use-case';
import { RacingCircuitRotationConfigKey } from '../../domain/entities/racing-circuit-rotation-config.entity';
import {
  CircuitRotationConfigListResponseDto,
  CircuitRotationConfigResponseDto,
} from './dto/circuit-rotation-config.response.dto';
import { UpdateCircuitRotationConfigDto } from './dto/update-circuit-rotation-config.dto';

// Gestión de los parámetros de la rotación diaria de circuitos (TASK-336) —
// conjunto cerrado, sin create/delete, mismo criterio que
// `AdminLeagueConfigsController`.
@ApiTags('racing-admin')
@Controller('admin/racing/circuit-rotation-config')
export class AdminCircuitRotationConfigController {
  constructor(
    private readonly listConfigs: ListCircuitRotationConfigsUseCase,
    private readonly updateConfig: AdminUpdateCircuitRotationConfigUseCase,
  ) {}

  @Get()
  @RequiresPermission('racing.circuit_rotation', 'READ')
  @ApiOperation({ summary: 'Listar los parámetros de rotación de circuitos' })
  @ApiOkResponse({ type: CircuitRotationConfigListResponseDto })
  async list(): Promise<CircuitRotationConfigListResponseDto> {
    return CircuitRotationConfigListResponseDto.fromDomain(
      await this.listConfigs.execute(),
    );
  }

  @Patch(':key')
  @RequiresPermission('racing.circuit_rotation', 'WRITE')
  @ApiOperation({ summary: 'Ajustar un parámetro de rotación de circuitos' })
  @ApiOkResponse({ type: CircuitRotationConfigResponseDto })
  async update(
    @Param('key', new ParseEnumPipe(RacingCircuitRotationConfigKey))
    key: RacingCircuitRotationConfigKey,
    @Body() dto: UpdateCircuitRotationConfigDto,
  ): Promise<CircuitRotationConfigResponseDto> {
    return CircuitRotationConfigResponseDto.fromDomain(
      await this.updateConfig.execute(key, dto.value),
    );
  }
}
