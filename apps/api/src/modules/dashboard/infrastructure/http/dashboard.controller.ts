import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { GetDashboardStatsUseCase } from '../../application/use-cases/get-dashboard-stats.use-case';
import { DashboardStatsResponseDto } from './dto/dashboard-stats-response.dto';

@ApiTags('dashboard')
@Auth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly getStats: GetDashboardStatsUseCase) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Métricas agregadas para el dashboard del backoffice.',
  })
  @ApiOkResponse({ type: DashboardStatsResponseDto })
  async stats(): Promise<DashboardStatsResponseDto> {
    return DashboardStatsResponseDto.from(await this.getStats.execute());
  }
}
