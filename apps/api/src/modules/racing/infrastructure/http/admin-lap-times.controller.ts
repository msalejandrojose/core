import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../../shared/http/decorators/api-paginated-response.decorator';
import { PaginatedResponseDto } from '../../../../shared/http/dto/paginated-response.dto';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { AdminListLapTimesUseCase } from '../../application/use-cases/admin-list-lap-times.use-case';
import { InvalidateLapTimeUseCase } from '../../application/use-cases/invalidate-lap-time.use-case';
import { AdminLapTimeListEntryResponseDto } from './dto/admin-lap-time-list-entry.response.dto';
import { AdminLapTimeResponseDto } from './dto/admin-lap-time.response.dto';
import { ListAdminLapTimesQueryDto } from './dto/list-admin-lap-times.query.dto';

// Cubre "anular tiempos" y "qué usuarios corrieron qué circuito y en cuánto
// tiempo" (TASK-242/246) — mismo hueco que pedía TASK-239 (Backoffice:
// circuitos y tiempos), un único controller.
@ApiTags('racing-admin')
@Controller('admin/racing/lap-times')
export class AdminLapTimesController {
  constructor(
    private readonly listLapTimes: AdminListLapTimesUseCase,
    private readonly invalidateLapTime: InvalidateLapTimeUseCase,
  ) {}

  @Get()
  @RequiresPermission('racing.lap_times', 'READ')
  @ApiOperation({
    summary: 'Listar todos los intentos, filtrable por circuito y jugador',
    description:
      'A diferencia del leaderboard del jugador (top N), incluye TODOS los intentos, válidos e inválidos.',
  })
  @ApiPaginatedResponse(AdminLapTimeListEntryResponseDto)
  async list(
    @Query() query: ListAdminLapTimesQueryDto,
  ): Promise<PaginatedResponseDto<AdminLapTimeListEntryResponseDto>> {
    const { items, total } = await this.listLapTimes.execute({
      page: query.page,
      limit: query.limit,
      trackId: query.trackId,
      userId: query.userId,
    });
    return PaginatedResponseDto.of(
      items.map((e) => AdminLapTimeListEntryResponseDto.fromEntry(e)),
      total,
      query.page,
      query.limit,
    );
  }

  @Post(':id/invalidate')
  @RequiresPermission('racing.lap_times', 'WRITE')
  @ApiOperation({
    summary: 'Anular un tiempo de vuelta',
    description:
      'No lo borra: queda constancia y sale del leaderboard, la posición y la mejor marca personal.',
  })
  @ApiOkResponse({ type: AdminLapTimeResponseDto })
  async invalidate(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AdminLapTimeResponseDto> {
    return AdminLapTimeResponseDto.fromLapTime(
      await this.invalidateLapTime.execute(id),
    );
  }
}
