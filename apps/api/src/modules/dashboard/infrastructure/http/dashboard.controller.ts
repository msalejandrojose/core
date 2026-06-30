import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetDashboardSummaryUseCase } from '../../application/use-cases/get-dashboard-summary.use-case';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary.response.dto';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly getSummary: GetDashboardSummaryUseCase) {}

  @Get('summary')
  @ApiOperation({ summary: 'KPIs de resumen del sistema' })
  @ApiOkResponse({ type: DashboardSummaryResponseDto })
  async summary(): Promise<DashboardSummaryResponseDto> {
    return this.getSummary.execute();
  }
}
