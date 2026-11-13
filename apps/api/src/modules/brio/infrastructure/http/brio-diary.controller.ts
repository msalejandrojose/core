import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { GetDaySummaryUseCase } from '../../application/use-cases/get-day-summary.use-case';
import { GetProgressUseCase } from '../../application/use-cases/get-progress.use-case';
import { DaySummaryResponseDto } from './dto/day-summary.response.dto';
import { ProgressResponseDto } from './dto/progress.response.dto';
import { DayQueryDto, ProgressQueryDto } from './dto/queries.dto';

// Lecturas del diario: el día (pantalla principal) y las series de progreso.
@ApiTags('brio')
@Auth()
@Controller('brio')
export class BrioDiaryController {
  constructor(
    private readonly getDay: GetDaySummaryUseCase,
    private readonly getProgress: GetProgressUseCase,
  ) {}

  @Get('day')
  @ApiOperation({
    summary:
      'Resumen de un día: totales, comidas y entrenos en una sola llamada.',
  })
  @ApiOkResponse({ type: DaySummaryResponseDto })
  async day(
    @CurrentUser() current: AccessTokenPayload,
    @Query() query: DayQueryDto,
  ): Promise<DaySummaryResponseDto> {
    return DaySummaryResponseDto.from(
      await this.getDay.execute(current.sub, query.day),
    );
  }

  @Get('progress')
  @ApiOperation({
    summary: 'Series de peso y balance calórico en una ventana de días.',
  })
  @ApiOkResponse({ type: ProgressResponseDto })
  async progress(
    @CurrentUser() current: AccessTokenPayload,
    @Query() query: ProgressQueryDto,
  ): Promise<ProgressResponseDto> {
    return ProgressResponseDto.from(
      await this.getProgress.execute({
        userId: current.sub,
        days: query.days,
        to: query.day,
      }),
    );
  }
}
