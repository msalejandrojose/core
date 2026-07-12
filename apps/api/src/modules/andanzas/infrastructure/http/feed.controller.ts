import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { GetFeedUseCase } from '../../application/use-cases/get-feed.use-case';
import { FeedQueryDto } from './dto/feed-query.dto';
import { MySiteEntryResponseDto } from './dto/my-site-entry.response.dto';

@ApiTags('andanzas/feed')
@Controller('andanzas/feed')
@Auth()
export class FeedController {
  constructor(private readonly getFeed: GetFeedUseCase) {}

  @Get()
  @ApiOperation({
    summary:
      'Sitios visitados y puntuados de la gente que sigues (más recientes primero) — sirve tanto para el feed como para pintar el mapa.',
  })
  @ApiCursorPaginatedResponse(MySiteEntryResponseDto)
  async get(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: FeedQueryDto,
  ): Promise<CursorPaginatedResponseDto<MySiteEntryResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.getFeed.execute({
      userId: user.sub,
      limit,
      cursor: query.cursor,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((entry) => MySiteEntryResponseDto.fromEntry(entry)),
      page.nextCursor,
      limit,
    );
  }
}
