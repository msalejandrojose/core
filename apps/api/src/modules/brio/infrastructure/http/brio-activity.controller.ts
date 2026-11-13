import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
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
import { GetActivitySessionUseCase } from '../../application/use-cases/get-activity-session.use-case';
import { ListActivitySessionsUseCase } from '../../application/use-cases/list-activity-sessions.use-case';
import { UpdateActivitySessionUseCase } from '../../application/use-cases/update-activity-session.use-case';
import { ReplaceSessionSetsUseCase } from '../../application/use-cases/replace-session-sets.use-case';
import { DeleteActivitySessionUseCase } from '../../application/use-cases/delete-activity-session.use-case';
import { ActivitySessionResponseDto } from './dto/activity-session.response.dto';
import { ActivityTypeResponseDto } from './dto/activity-type.response.dto';
import { LogActivityDto } from './dto/log-activity.dto';
import { ReplaceSetsDto, flattenSets } from './dto/strength-sets.dto';
import {
  ListActivitiesQueryDto,
  UpdateActivityDto,
} from './dto/update-activity.dto';

@ApiTags('brio')
@Auth()
@Controller('brio')
export class BrioActivityController {
  constructor(
    private readonly listTypes: ListActivityTypesUseCase,
    private readonly logSession: LogActivitySessionUseCase,
    private readonly deleteSession: DeleteActivitySessionUseCase,
    private readonly replaceSets: ReplaceSessionSetsUseCase,
    private readonly listSessions: ListActivitySessionsUseCase,
    private readonly getSession: GetActivitySessionUseCase,
    private readonly updateSession: UpdateActivitySessionUseCase,
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
  @ApiNotFoundResponse({ description: 'BRIO_ACTIVITY_TYPE_NOT_FOUND.' })
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

  @Get('activities')
  @ApiOperation({
    summary: 'Mi historial de entrenos, del más reciente al más antiguo.',
  })
  @ApiOkResponse({ type: [ActivitySessionResponseDto] })
  async history(
    @CurrentUser() current: AccessTokenPayload,
    @Query() query: ListActivitiesQueryDto,
  ): Promise<ActivitySessionResponseDto[]> {
    const sessions = await this.listSessions.execute(
      current.sub,
      query.before ? new Date(query.before) : null,
      query.limit ?? 30,
    );
    return sessions.map((s) => ActivitySessionResponseDto.from(s));
  }

  @Get('activities/:id')
  @ApiOperation({ summary: 'Un entreno mío, con sus series.' })
  @ApiOkResponse({ type: ActivitySessionResponseDto })
  @ApiNotFoundResponse({ description: 'BRIO_ACTIVITY_SESSION_NOT_FOUND.' })
  async one(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ActivitySessionResponseDto> {
    return ActivitySessionResponseDto.from(
      await this.getSession.execute(id, current.sub),
    );
  }

  @Patch('activities/:id')
  @ApiOperation({
    summary:
      'Editar un entreno mío (duración, distancia, pulsaciones, RPE…). null vacía un campo.',
  })
  @ApiOkResponse({ type: ActivitySessionResponseDto })
  @ApiNotFoundResponse({ description: 'BRIO_ACTIVITY_SESSION_NOT_FOUND.' })
  async update(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateActivityDto,
  ): Promise<ActivitySessionResponseDto> {
    const { startedAt, ...rest } = body;
    const session = await this.updateSession.execute(id, current.sub, {
      ...rest,
      ...(startedAt ? { startedAt: new Date(startedAt) } : {}),
    });
    return ActivitySessionResponseDto.from(session);
  }

  @Put('activities/:id/sets')
  @ApiOperation({
    summary: 'Sustituir las series de una sesión de fuerza (edición).',
  })
  @ApiOkResponse({ type: ActivitySessionResponseDto })
  @ApiNotFoundResponse({
    description: 'BRIO_ACTIVITY_SESSION_NOT_FOUND o BRIO_EXERCISE_NOT_FOUND.',
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
  @ApiNotFoundResponse({ description: 'BRIO_ACTIVITY_SESSION_NOT_FOUND.' })
  async remove(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.deleteSession.execute(id, current.sub);
  }
}
