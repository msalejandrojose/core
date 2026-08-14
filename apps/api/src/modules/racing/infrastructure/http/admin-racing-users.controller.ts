import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { AdminGetUserRacingSummaryUseCase } from '../../application/use-cases/admin-get-user-racing-summary.use-case';
import { UserRacingSummaryResponseDto } from './dto/user-racing-summary.response.dto';

// Ficha de racing de un jugador (TASK-251): la vista simétrica de
// AdminLapTimesController — en vez de partir del circuito, se parte del
// usuario. Mismo permiso que esa lista: es la misma información, solo
// agrupada distinto.
@ApiTags('racing-admin')
@Controller('admin/racing/users')
export class AdminRacingUsersController {
  constructor(private readonly getSummary: AdminGetUserRacingSummaryUseCase) {}

  @Get(':userId/summary')
  @RequiresPermission('racing.lap_times', 'READ')
  @ApiOperation({
    summary: 'Ficha de racing de un jugador',
    description:
      'Circuitos con al menos un intento (mejor tiempo y posición en el ranking de cada uno) y el coche que tiene equipado ahora mismo.',
  })
  @ApiOkResponse({ type: UserRacingSummaryResponseDto })
  async summary(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<UserRacingSummaryResponseDto> {
    return UserRacingSummaryResponseDto.fromDomain(
      await this.getSummary.execute(userId),
    );
  }
}
