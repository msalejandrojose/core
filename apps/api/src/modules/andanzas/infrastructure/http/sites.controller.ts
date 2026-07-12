import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiCursorPaginatedResponse,
  CursorPaginatedResponseDto,
} from '../../../../shared/pagination';
import { type AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { Auth } from '../../../iam/infrastructure/http/decorators/auth.decorator';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { CreateSiteUseCase } from '../../application/use-cases/create-site.use-case';
import { GetSiteUseCase } from '../../application/use-cases/get-site.use-case';
import { ListSitesUseCase } from '../../application/use-cases/list-sites.use-case';
import { CreateSiteDto } from './dto/create-site.dto';
import { ListSitesQueryDto } from './dto/list-sites.query.dto';
import { SiteResponseDto } from './dto/site.response.dto';

@ApiTags('andanzas/sites')
@Controller('andanzas/sites')
@Auth()
export class SitesController {
  constructor(
    private readonly createSite: CreateSiteUseCase,
    private readonly getSite: GetSiteUseCase,
    private readonly listSites: ListSitesUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Crear un sitio a mano (pin + nombre + categoría), con tags opcionales.',
  })
  @ApiCreatedResponse({ type: SiteResponseDto })
  async create(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: CreateSiteDto,
  ): Promise<SiteResponseDto> {
    const site = await this.createSite.execute({
      createdByUserId: user.sub,
      ...dto,
    });
    return SiteResponseDto.fromSite(site);
  }

  @Get()
  @ApiOperation({ summary: 'Listar/buscar sitios (cursor paginado).' })
  @ApiCursorPaginatedResponse(SiteResponseDto)
  async list(
    @Query() query: ListSitesQueryDto,
  ): Promise<CursorPaginatedResponseDto<SiteResponseDto>> {
    const limit = query.limit ?? 20;
    const page = await this.listSites.execute({
      limit,
      cursor: query.cursor,
      category: query.category,
      nameContains: query.nameContains,
    });
    return CursorPaginatedResponseDto.of(
      page.items.map((site) => SiteResponseDto.fromSite(site)),
      page.nextCursor,
      limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver el detalle de un sitio.' })
  @ApiOkResponse({ type: SiteResponseDto })
  async get(@Param('id') id: string): Promise<SiteResponseDto> {
    const site = await this.getSite.execute(id);
    return SiteResponseDto.fromSite(site);
  }
}
