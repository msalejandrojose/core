import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { ListActivityTypesUseCase } from '../../application/use-cases/list-activity-types.use-case';
import { LogActivitySessionUseCase } from '../../application/use-cases/log-activity-session.use-case';
import { ReplaceSessionSetsUseCase } from '../../application/use-cases/replace-session-sets.use-case';
import { DeleteActivitySessionUseCase } from '../../application/use-cases/delete-activity-session.use-case';
import { ActivitySessionResponseDto } from './dto/activity-session.response.dto';
import { ActivityTypeResponseDto } from './dto/activity-type.response.dto';
import { LogActivityDto } from './dto/log-activity.dto';
import { ReplaceSetsDto, flattenSets } from './dto/strength-sets.dto';

@ApiTags('ritmo')
@Auth()
@Controller('ritmo')
export class RitmoActivityController {
  constructor(
    private readonly listTypes: ListActivityTypesUseCase,
    private readonly logSession: LogActivitySessionUseCase,
    private readonly deleteSession: DeleteActivitySessionUseCase,
    private readonly replaceSets: ReplaceSessionSetsUseCase,
  ) {}

  @Get('activity-types')
  @ApiOperation({
    summary: 'Catálogo de tipos de actividad (globales + los míos).',
  })
  @ApiOkResponse({ type: [ActivityTypeResponseDto] })
  async types(
    @CurrentUser() current: AccessTokenPayload,
  ): Promise<ActivityTypeResponseDto[]> {
    const types = await this.listTypes.execute(current.sub);
    return types.map((item) => ActivityTypeResponseDto.from(item));
  }

  @Post('activities')
  @ApiOperation({
    summary: 'Registrar una sesión de actividad; la API estima las kcal.',
  })
  @ApiCreatedResponse({ type: ActivitySessionResponseDto })
  @ApiNotFoundResponse({ description: 'RITMO_ACTIVITY_TYPE_NOT_FOUND.' })
  async log(
    @CurrentUser() current: AccessTokenPayload,
    @Body() body: LogActivityDto,
  ): Promise<ActivitySessionResponseDto> {
    const session = await this.logSession.execute({
      userId: current.sub,
      activityTypeId: body.activityTypeId,
      startedAt: new Date(body.startedAt),
      durationSec: body.durationSec,
      distanceM: body.distanceM ?? null,
      avgHeartRate: body.avgHeartRate ?? null,
      maxHeartRate: body.maxHeartRate ?? null,
      elevationGainM: body.elevationGainM ?? null,
      cadence: body.cadence ?? null,
      rpe: body.rpe ?? null,
      zoneSeconds: body.zoneSeconds ?? null,
      sets: flattenSets(body.exercises),
      effort: body.effort ?? null,
      notes: body.notes ?? null,
    });
    return ActivitySessionResponseDto.from(session);
  }

  @Put('activities/:id/sets')
  @ApiOperation({
    summary: 'Sustituir las series de una sesión de fuerza (edición).',
  })
  @ApiOkResponse({ type: ActivitySessionResponseDto })
  @ApiNotFoundResponse({
    description: 'RITMO_ACTIVITY_SESSION_NOT_FOUND o RITMO_EXERCISE_NOT_FOUND.',
  })
  async sets(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ReplaceSetsDto,
  ): Promise<ActivitySessionResponseDto> {
    const session = await this.replaceSets.execute(
      id,
      current.sub,
      flattenSets(body.exercises),
    );
    return ActivitySessionResponseDto.from(session);
  }

  @Delete('activities/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Borrar una sesión mía y refrescar el día.' })
  @ApiNoContentResponse({ description: 'Sesión borrada.' })
  @ApiNotFoundResponse({ description: 'RITMO_ACTIVITY_SESSION_NOT_FOUND.' })
  async remove(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.deleteSession.execute(id, current.sub);
  }
}
