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
import { GetGhostUseCase } from '../../application/use-cases/get-ghost.use-case';
import { GetLeaderboardUseCase } from '../../application/use-cases/get-leaderboard.use-case';
import { GetOnlineRaceUseCase } from '../../application/use-cases/get-online-race.use-case';
import { GetPersonalBestUseCase } from '../../application/use-cases/get-personal-best.use-case';
import { GetTrackUseCase } from '../../application/use-cases/get-track.use-case';
import { ListTracksUseCase } from '../../application/use-cases/list-tracks.use-case';
import { MatchOnlineRaceUseCase } from '../../application/use-cases/match-online-race.use-case';
import { SubmitLapTimeUseCase } from '../../application/use-cases/submit-lap-time.use-case';
import { SubmitOnlineRaceResultUseCase } from '../../application/use-cases/submit-online-race-result.use-case';
import { GhostResponseDto } from './dto/ghost.response.dto';
import {
  LapTimeResponseDto,
  SubmitLapTimeResponseDto,
} from './dto/lap-time.response.dto';
import {
  LeaderboardEntryDto,
  LeaderboardResponseDto,
} from './dto/leaderboard.response.dto';
import { OnlineRaceMatchResponseDto } from './dto/online-race-match.response.dto';
import { OnlineRaceResponseDto } from './dto/online-race.response.dto';
import { SubmitLapTimeDto } from './dto/submit-lap-time.dto';
import { SubmitOnlineRaceResultDto } from './dto/submit-online-race-result.dto';
import { TrackDetailResponseDto } from './dto/track-detail.response.dto';
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
    private readonly getTrack: GetTrackUseCase,
    private readonly getGhost: GetGhostUseCase,
    private readonly submitOnlineRaceResult: SubmitOnlineRaceResultUseCase,
    private readonly getOnlineRace: GetOnlineRaceUseCase,
    private readonly matchOnlineRace: MatchOnlineRaceUseCase,
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
      page.items.map((track) => TrackResponseDto.fromTrack(track)),
      page.nextCursor,
      limit,
    );
  }

  @Get('tracks/:slug')
  @ApiOperation({
    summary: 'Circuito completo por slug, con geometría',
    description:
      'Para construir un circuito que no esté en el catálogo local del cliente (TASK-245) — típicamente uno nacido en el backoffice, o una manga de Grand Prix.',
  })
  @ApiOkResponse({ type: TrackDetailResponseDto })
  async detail(@Param('slug') slug: string): Promise<TrackDetailResponseDto> {
    return TrackDetailResponseDto.fromTrack(await this.getTrack.execute(slug));
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
      ghostSnapshots: body.ghostSnapshots,
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
    @Query(
      'limit',
      new DefaultValuePipe(DEFAULT_LEADERBOARD_LIMIT),
      ParseIntPipe,
    )
    limit: number,
  ): Promise<LeaderboardResponseDto> {
    const result = await this.getLeaderboard.execute(
      slug,
      current.sub,
      Math.min(Math.max(limit, 1), MAX_LEADERBOARD_LIMIT),
    );

    return {
      entries: result.entries.map((entry) =>
        LeaderboardEntryDto.fromEntry(entry),
      ),
      yourPosition: result.yourPosition,
    };
  }

  @Get('tracks/:slug/ghosts/:userId')
  @ApiOperation({
    summary: 'Fantasma de la mejor marca de OTRO jugador en un circuito',
    description:
      'Para correr contra el fantasma de un rival (TASK-221). Null si ese jugador no tiene marca ahí, o si la tiene de antes de que existiera el fantasma — no es un error, es un estado normal.',
  })
  @ApiOkResponse({ type: GhostResponseDto, nullable: true })
  async ghost(
    @Param('slug') slug: string,
    @Param('userId') userId: string,
  ): Promise<GhostResponseDto | null> {
    const result = await this.getGhost.execute(slug, userId);
    return result === null ? null : GhostResponseDto.fromResult(result);
  }

  @Get('tracks/:slug/online-races/match')
  @ApiOperation({
    summary: 'Empareja rivales para una carrera online (TASK-282/284)',
    description:
      'Objetivo (ligeramente mejor) y amenaza (ligeramente peor), con sus fantasmas completos listos para reproducir. Se recalcula en cada llamada — no hay carrera fijada de antemano. No persiste nada: la carrera solo se registra al subir su resultado con POST tracks/:slug/online-races.',
  })
  @ApiOkResponse({ type: OnlineRaceMatchResponseDto })
  async matchOnline(
    @CurrentUser() current: AccessTokenPayload,
    @Param('slug') slug: string,
  ): Promise<OnlineRaceMatchResponseDto> {
    const match = await this.matchOnlineRace.execute(current.sub, slug);
    return OnlineRaceMatchResponseDto.fromMatch(match);
  }

  @Post('tracks/:slug/online-races')
  @ApiOperation({
    summary: 'Registra el resultado de una carrera online ya jugada',
    description:
      'El jugador contra hasta dos fantasmas rivales (TASK-283). No decide contra quién se corre — eso lo elige el emparejamiento (TASK-284) o el propio cliente al elegir un amigo — aquí solo se valida y se resuelve el podio, una única vez.',
  })
  @ApiOkResponse({ type: OnlineRaceResponseDto })
  async submitOnlineRace(
    @CurrentUser() current: AccessTokenPayload,
    @Param('slug') slug: string,
    @Body() body: SubmitOnlineRaceResultDto,
  ): Promise<OnlineRaceResponseDto> {
    const race = await this.submitOnlineRaceResult.execute({
      userId: current.sub,
      trackSlug: slug,
      participants: body.participants,
    });
    return OnlineRaceResponseDto.fromRace(race);
  }

  @Get('online-races/:id')
  @ApiOperation({
    summary: 'Una carrera online ya jugada, con su podio',
    description:
      'Posición y diferencias ya vienen calculadas de cuando se registró la carrera — reconstruir el podio no recalcula nada.',
  })
  @ApiOkResponse({ type: OnlineRaceResponseDto })
  async getOnlineRaceById(
    @Param('id') id: string,
  ): Promise<OnlineRaceResponseDto> {
    return OnlineRaceResponseDto.fromRace(await this.getOnlineRace.execute(id));
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
