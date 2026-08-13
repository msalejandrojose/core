import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { InvalidateLapTimeUseCase } from '../../application/use-cases/invalidate-lap-time.use-case';
import { AdminLapTimeResponseDto } from './dto/admin-lap-time.response.dto';

// Cubre "anular tiempos" del criterio de done de TASK-242 — mismo hueco que
// pedía TASK-239 (Backoffice: circuitos y tiempos), un único endpoint.
@ApiTags('racing-admin')
@Controller('admin/racing/lap-times')
export class AdminLapTimesController {
  constructor(private readonly invalidateLapTime: InvalidateLapTimeUseCase) {}

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
