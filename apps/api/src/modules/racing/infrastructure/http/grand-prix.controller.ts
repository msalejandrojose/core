import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { GetGrandPrixLeaderboardUseCase } from '../../application/use-cases/get-grand-prix-leaderboard.use-case';
import { GetGrandPrixUseCase } from '../../application/use-cases/get-grand-prix.use-case';
import { ListGrandPrixUseCase } from '../../application/use-cases/list-grand-prix.use-case';
import { StartOrResumeGrandPrixAttemptUseCase } from '../../application/use-cases/start-or-resume-grand-prix-attempt.use-case';
import { SubmitGrandPrixStageResultUseCase } from '../../application/use-cases/submit-grand-prix-stage-result.use-case';
import { GrandPrixAttemptResponseDto } from './dto/grand-prix-attempt.response.dto';
import {
  GrandPrixLeaderboardEntryDto,
  GrandPrixLeaderboardResponseDto,
} from './dto/grand-prix-leaderboard.response.dto';
import { GrandPrixResponseDto } from './dto/grand-prix.response.dto';
import { SubmitGrandPrixStageResultDto } from './dto/submit-grand-prix-stage-result.dto';

const DEFAULT_LEADERBOARD_LIMIT = 20;
const MAX_LEADERBOARD_LIMIT = 100;

// De cara al jugador: catálogo de Grand Prix activos, arrancar/reanudar un
// intento, subir el resultado de cada manga y consultar la clasificación.
// Separado de AdminGrandPrixController, que gestiona el catálogo.
@ApiTags('racing')
@Auth()
@Controller('racing/grand-prix')
export class GrandPrixController {
  constructor(
    private readonly listGrandPrix: ListGrandPrixUseCase,
    private readonly getGrandPrix: GetGrandPrixUseCase,
    private readonly startOrResume: StartOrResumeGrandPrixAttemptUseCase,
    private readonly submitStageResult: SubmitGrandPrixStageResultUseCase,
    private readonly getLeaderboard: GetGrandPrixLeaderboardUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Grand Prix activos' })
  @ApiOkResponse({ type: [GrandPrixResponseDto] })
  async list(): Promise<GrandPrixResponseDto[]> {
    const items = await this.listGrandPrix.execute();
    return items.map((item) => GrandPrixResponseDto.fromDomain(item));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Grand Prix por id, con sus circuitos en orden' })
  @ApiOkResponse({ type: GrandPrixResponseDto })
  async get(@Param('id') id: string): Promise<GrandPrixResponseDto> {
    return GrandPrixResponseDto.fromDomain(await this.getGrandPrix.execute(id));
  }

  @Post(':id/attempts')
  @ApiOperation({
    summary: 'Arranca o reanuda el intento en curso',
    description:
      'Si ya hay un intento IN_PROGRESS de este jugador para este Grand Prix, se devuelve ese — no se crea uno nuevo (TASK-247: se puede abandonar y reanudar).',
  })
  @ApiOkResponse({ type: GrandPrixAttemptResponseDto })
  async startOrResumeAttempt(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id') id: string,
  ): Promise<GrandPrixAttemptResponseDto> {
    const [attempt, grandPrix] = await Promise.all([
      this.startOrResume.execute(current.sub, id),
      this.getGrandPrix.execute(id),
    ]);
    return GrandPrixAttemptResponseDto.fromDomain(attempt, grandPrix);
  }

  @Post(':id/stages/:trackId/result')
  @ApiOperation({
    summary: 'Sube el resultado de una manga del intento en curso',
    description:
      'Rechaza con RACING_GRAND_PRIX_ATTEMPT_STAGE_MISMATCH si trackId no es la siguiente manga pendiente. Si era la última, el intento pasa a COMPLETED con el total ya calculado.',
  })
  @ApiOkResponse({ type: GrandPrixAttemptResponseDto })
  async submitStage(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id') id: string,
    @Param('trackId') trackId: string,
    @Body() body: SubmitGrandPrixStageResultDto,
  ): Promise<GrandPrixAttemptResponseDto> {
    const [attempt, grandPrix] = await Promise.all([
      this.submitStageResult.execute({
        userId: current.sub,
        grandPrixId: id,
        trackId,
        durationMs: body.durationMs,
      }),
      this.getGrandPrix.execute(id),
    ]);
    return GrandPrixAttemptResponseDto.fromDomain(attempt, grandPrix);
  }

  @Get(':id/leaderboard')
  @ApiOperation({
    summary: 'Top del Grand Prix y posición propia',
    description:
      'Un jugador aparece una sola vez, con su mejor intento completado. `yourPosition` llega siempre, aunque quedes fuera del top.',
  })
  @ApiOkResponse({ type: GrandPrixLeaderboardResponseDto })
  async leaderboard(
    @CurrentUser() current: AccessTokenPayload,
    @Param('id') id: string,
    @Query(
      'limit',
      new DefaultValuePipe(DEFAULT_LEADERBOARD_LIMIT),
      ParseIntPipe,
    )
    limit: number,
  ): Promise<GrandPrixLeaderboardResponseDto> {
    const result = await this.getLeaderboard.execute(
      id,
      current.sub,
      Math.min(Math.max(limit, 1), MAX_LEADERBOARD_LIMIT),
    );

    return {
      entries: result.entries.map((entry) =>
        GrandPrixLeaderboardEntryDto.fromEntry(entry),
      ),
      yourPosition: result.yourPosition,
    };
  }
}
