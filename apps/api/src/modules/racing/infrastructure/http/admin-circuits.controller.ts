import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../../shared/http/decorators/api-paginated-response.decorator';
import { PaginatedResponseDto } from '../../../../shared/http/dto/paginated-response.dto';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { FileViewTokenService } from '../../../storage/infrastructure/http/file-view-token.service';
import { AdminGetCircuitUseCase } from '../../application/use-cases/admin-get-circuit.use-case';
import { AdminListCircuitsUseCase } from '../../application/use-cases/admin-list-circuits.use-case';
import { AdminUpdateCircuitUseCase } from '../../application/use-cases/admin-update-circuit.use-case';
import { AutoRotateCircuitsUseCase } from '../../application/use-cases/auto-rotate-circuits.use-case';
import { AdminCircuitResponseDto } from './dto/admin-circuit.response.dto';
import { ListAdminCircuitsQueryDto } from './dto/list-admin-circuits.query.dto';
import { UpdateCircuitDto } from './dto/update-circuit.dto';

// Endpoints de backoffice para los circuitos BASE (TASK-336): trazado, tema,
// agarre, imagen e interruptor manual de activación. Sin `POST` (crear uno
// nuevo desde cero generaría sus ~18 variantes, fuera de esta entrega — hoy
// sigue siendo vía `seed-racing.ts`).
@ApiTags('racing-admin')
@Controller('admin/racing/circuits')
export class AdminCircuitsController {
  constructor(
    private readonly listCircuits: AdminListCircuitsUseCase,
    private readonly getCircuit: AdminGetCircuitUseCase,
    private readonly updateCircuit: AdminUpdateCircuitUseCase,
    private readonly autoRotate: AutoRotateCircuitsUseCase,
    private readonly viewTokens: FileViewTokenService,
  ) {}

  @Get()
  @RequiresPermission('racing.circuits', 'READ')
  @ApiOperation({ summary: 'Listar circuitos base (activos e inactivos)' })
  @ApiPaginatedResponse(AdminCircuitResponseDto)
  async list(
    @Query() query: ListAdminCircuitsQueryDto,
  ): Promise<PaginatedResponseDto<AdminCircuitResponseDto>> {
    const { items, total } = await this.listCircuits.execute({
      page: query.page,
      limit: query.limit,
      search: query.search,
    });
    return PaginatedResponseDto.of(
      items.map((circuit) =>
        AdminCircuitResponseDto.fromDomain(circuit, this.imageUrl(circuit.imageId)),
      ),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequiresPermission('racing.circuits', 'READ')
  @ApiOperation({ summary: 'Circuito base por id, con su trazado completo' })
  @ApiOkResponse({ type: AdminCircuitResponseDto })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminCircuitResponseDto> {
    const circuit = await this.getCircuit.execute(id);
    return AdminCircuitResponseDto.fromDomain(circuit, this.imageUrl(circuit.imageId));
  }

  @Patch(':id')
  @RequiresPermission('racing.circuits', 'WRITE')
  @ApiOperation({
    summary: 'Editar un circuito base',
    description:
      'También activa/desactiva (campo isActive) el circuito entero sin perder su histórico.',
  })
  @ApiOkResponse({ type: AdminCircuitResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCircuitDto,
  ): Promise<AdminCircuitResponseDto> {
    const circuit = await this.updateCircuit.execute(id, {
      name: dto.name,
      checkpoints: dto.checkpoints,
      path: dto.path,
      theme: dto.theme,
      grip: dto.grip,
      isActive: dto.isActive,
      imageId: dto.imageId,
    });
    return AdminCircuitResponseDto.fromDomain(circuit, this.imageUrl(circuit.imageId));
  }

  @Post('rotate')
  @HttpCode(204)
  @RequiresPermission('racing.circuits', 'WRITE')
  @ApiOperation({
    summary: 'Fuerza una rotación de circuitos ya',
    description:
      'Se salta la comprobación de "¿ya rotó hoy?" — pensado para verificar/operar sin esperar al cron ni al cambio de día.',
  })
  async rotateNow(): Promise<void> {
    await this.autoRotate.execute(new Date(), { force: true });
  }

  // Ver el comentario homólogo en `RacingController`.
  private imageUrl(imageId: string | null): string | null {
    return imageId
      ? `/files/view?token=${this.viewTokens.issue(imageId)}`
      : null;
  }
}
