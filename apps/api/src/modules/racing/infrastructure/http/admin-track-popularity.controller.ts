import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { AdminTrackPopularityUseCase } from '../../application/use-cases/admin-track-popularity.use-case';
import { AdminTrackPopularityListResponseDto } from './dto/admin-track-popularity.response.dto';

// Reporte de "qué circuitos se juegan y cuáles se abandonan" (TASK-240):
// no encaja en el sistema de KPIs genérico (tarjeta/serie temporal), porque
// es un desglose POR circuito, así que va como reporte propio en vez de
// como KPI registrado en el dashboard.
@ApiTags('racing-admin')
@Controller('admin/racing/track-popularity')
export class AdminTrackPopularityController {
  constructor(private readonly trackPopularity: AdminTrackPopularityUseCase) {}

  @Get()
  @RequiresPermission('racing.track_popularity', 'READ')
  @ApiOperation({
    summary: 'Actividad por circuito: total, jugadores distintos y últimos 30 días vs los 30 anteriores',
  })
  @ApiOkResponse({ type: AdminTrackPopularityListResponseDto })
  async list(): Promise<AdminTrackPopularityListResponseDto> {
    return AdminTrackPopularityListResponseDto.fromDomain(
      await this.trackPopularity.execute(),
    );
  }
}
