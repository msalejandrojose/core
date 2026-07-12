import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { SetSiteEntryStatusUseCase } from '../../application/use-cases/set-site-entry-status.use-case';
import { ListMySiteEntriesUseCase } from '../../application/use-cases/list-my-site-entries.use-case';
import { StartRatingUseCase } from '../../application/use-cases/start-rating.use-case';
import { AnswerRatingComparisonUseCase } from '../../application/use-cases/answer-rating-comparison.use-case';
import { SetSiteEntryStatusDto } from './dto/set-site-entry-status.dto';
import { SiteEntryResponseDto } from './dto/site-entry.response.dto';
import { ListMySiteEntriesQueryDto } from './dto/list-my-site-entries.query.dto';
import { MySiteEntryResponseDto } from './dto/my-site-entry.response.dto';
import { StartRatingDto } from './dto/start-rating.dto';
import { AnswerRatingComparisonDto } from './dto/answer-rating-comparison.dto';
import { RatingStepResponseDto } from './dto/rating-step.response.dto';

@ApiTags('andanzas/site-entries')
@Controller('andanzas/site-entries')
@Auth()
export class SiteEntriesController {
  constructor(
    private readonly setStatus: SetSiteEntryStatusUseCase,
    private readonly listMine: ListMySiteEntriesUseCase,
    private readonly startRating: StartRatingUseCase,
    private readonly answerComparison: AnswerRatingComparisonUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Marcar un sitio como quiero-ir o visitado (sin puntuar). Para puntuar, usa /rating.',
  })
  @ApiCreatedResponse({ type: SiteEntryResponseDto })
  async setEntryStatus(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: SetSiteEntryStatusDto,
  ): Promise<SiteEntryResponseDto> {
    const entry = await this.setStatus.execute({ userId: user.sub, ...dto });
    return SiteEntryResponseDto.fromEntry(entry);
  }

  @Get('me')
  @ApiOperation({ summary: 'Tu lista de sitios (cursor paginada), con su nota si ya la tienen.' })
  @ApiCursorPaginatedResponse(MySiteEntryResponseDto)
  async listMy(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: ListMySiteEntriesQueryDto,
  ): Promise<CursorPaginatedResponseDto<MySiteEntryResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listMine.execute({
      userId: user.sub,
      status: query.status,
      limit,
      cursor: query.cursor,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((entry) => MySiteEntryResponseDto.fromEntry(entry)),
      page.nextCursor,
      limit,
    );
  }

  @Get('user/:userId')
  @ApiOperation({
    summary:
      'Lista de sitios de otro usuario (cursor paginada). En el MVP cualquier perfil es visible (ver TASK-167, canViewProfile) — Follow decide el feed, no el acceso al perfil.',
  })
  @ApiCursorPaginatedResponse(MySiteEntryResponseDto)
  async listByUser(
    @Param('userId') userId: string,
    @Query() query: ListMySiteEntriesQueryDto,
  ): Promise<CursorPaginatedResponseDto<MySiteEntryResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listMine.execute({
      userId,
      status: query.status,
      limit,
      cursor: query.cursor,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((entry) => MySiteEntryResponseDto.fromEntry(entry)),
      page.nextCursor,
      limit,
    );
  }

  @Post(':siteId/rating')
  @ApiOperation({
    summary:
      'Arranca el flujo de puntuación por comparación (marca VISITED si hace falta). Devuelve la nota si es el primer sitio de la banda, o la primera comparación a responder.',
  })
  @ApiCreatedResponse({ type: RatingStepResponseDto })
  async rate(
    @CurrentUser() user: AccessTokenPayload,
    @Param('siteId') siteId: string,
    @Body() dto: StartRatingDto,
  ): Promise<RatingStepResponseDto> {
    const result = await this.startRating.execute({
      userId: user.sub,
      siteId,
      ...dto,
    });
    return RatingStepResponseDto.fromResult(result);
  }

  @Post(':siteId/rating/answer')
  @ApiOperation({
    summary: 'Responde una comparación del flujo de puntuación. Devuelve la siguiente o la nota final.',
  })
  @ApiOkResponse({ type: RatingStepResponseDto })
  async answerRatingStep(
    @CurrentUser() user: AccessTokenPayload,
    @Param('siteId') siteId: string,
    @Body() dto: AnswerRatingComparisonDto,
  ): Promise<RatingStepResponseDto> {
    const result = await this.answerComparison.execute({
      userId: user.sub,
      siteId,
      ...dto,
    });
    return RatingStepResponseDto.fromResult(result);
  }
}
