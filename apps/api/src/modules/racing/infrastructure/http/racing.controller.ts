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
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
  CursorPaginationQueryDto,
} from '../../../../shared/pagination';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { GetLeaderboardUseCase } from '../../application/use-cases/get-leaderboard.use-case';
import { GetPersonalBestUseCase } from '../../application/use-cases/get-personal-best.use-case';
import { ListTracksUseCase } from '../../application/use-cases/list-tracks.use-case';
import { SubmitLapTimeUseCase } from '../../application/use-cases/submit-lap-time.use-case';
import {
  LapTimeResponseDto,
  SubmitLapTimeResponseDto,
} from './dto/lap-time.response.dto';
import {
  LeaderboardEntryDto,
  LeaderboardResponseDto,
} from './dto/leaderboard.response.dto';
import { SubmitLapTimeDto } from './dto/submit-lap-time.dto';
import { TrackResponseDto } from './dto/track.response.dto';

// Cuántas filas devuelve el leaderboard por defecto y como mucho. El tope
// existe para que nadie se descargue la tabla entera de una: la posición propia
// se devuelve aparte, así que no hace falta paginar para saber dónde vas.
const DEFAULT_PAGE_LIMIT = 20;
const DEFAULT_LEADERBOARD_LIMIT = 20;
const MAX_LEADERBOARD_LIMIT = 100;

// Los circuitos se identifican por SLUG y no por id: el cliente conoce sus
// circuitos por nombre ("kenney-01", "nevado-rev") desde su propio catálogo, y
// obligarle a resolver un uuid antes de subir un tiempo sería una llamada de
// más en el peor momento, justo al cruzar la meta.
@ApiTags('racing')
@Auth()
@Controller('racing')
export class RacingController {
  constructor(
    private readonly listTracks: ListTracksUseCase,
    private readonly submitLapTime: SubmitLapTimeUseCase,
    private readonly getLeaderboard: GetLeaderboardUseCase,
    private readonly getPersonalBest: GetPersonalBestUseCase,
  ) {}

  @Get('tracks')
  @ApiOperation({ summary: 'Circuitos activos' })
  @ApiCursorPaginatedResponse(TrackResponseDto)
  async list(
    @Query() query: CursorPaginationQueryDto,
  ): Promise<CursorPaginatedResponseDto<TrackResponseDto>> {
    const limit = query.limit ?? DEFAULT_PAGE_LIMIT;
    const page = await this.listTracks.execute({
      limit,
      cursor: query.cursor,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map(TrackResponseDto.fromTrack),
      page.nextCursor,
      limit,
    );
  }

  @Post('tracks/:slug/lap-times')
  @ApiOperation({
    summary: 'Sube un tiempo de vuelta',
    description:
      'Rechaza con RACING_IMPLAUSIBLE_LAP_TIME las vueltas imposibles: por debajo del mínimo físico del circuito, con splits incoherentes, o llegadas antes de que diera tiempo a correrlas.',
  })
  @ApiOkResponse({ type: SubmitLapTimeResponseDto })
  async submit(
    @CurrentUser() current: AccessTokenPayload,
    @Param('slug') slug: string,
    @Body() body: SubmitLapTimeDto,
  ): Promise<SubmitLapTimeResponseDto> {
    const result = await this.submitLapTime.execute({
      userId: current.sub,
      trackSlug: slug,
      durationMs: body.durationMs,
      splitsMs: body.splitsMs,
      clientVersion: body.clientVersion,
    });

    return {
      lapTime: LapTimeResponseDto.fromLapTime(result.lapTime),
      personalBest: result.personalBest,
      position: result.position,
    };
  }

  @Get('tracks/:slug/leaderboard')
  @ApiOperation({
    summary: 'Top del circuito y posición propia',
    description:
      'Un jugador aparece una sola vez, con su mejor marca. `yourPosition` llega siempre, aunque quedes fuera del top.',
  })
  @ApiOkResponse({ type: LeaderboardResponseDto })
  async leaderboard(
    @CurrentUser() current: AccessTokenPayload,
    @Param('slug') slug: string,
    @Query('limit', new DefaultValuePipe(DEFAULT_LEADERBOARD_LIMIT), ParseIntPipe)
    limit: number,
  ): Promise<LeaderboardResponseDto> {
    const result = await this.getLeaderboard.execute(
      slug,
      current.sub,
      Math.min(Math.max(limit, 1), MAX_LEADERBOARD_LIMIT),
    );

    return {
      entries: result.entries.map(LeaderboardEntryDto.fromEntry),
      yourPosition: result.yourPosition,
    };
  }

  @Get('me/best/:slug')
  @ApiOperation({ summary: 'Mejor tiempo propio en un circuito' })
  @ApiOkResponse({ type: LapTimeResponseDto, nullable: true })
  async personalBest(
    @CurrentUser() current: AccessTokenPayload,
    @Param('slug') slug: string,
  ): Promise<LapTimeResponseDto | null> {
    const lap = await this.getPersonalBest.execute(current.sub, slug);
    return lap === null ? null : LapTimeResponseDto.fromLapTime(lap);
  }
}
