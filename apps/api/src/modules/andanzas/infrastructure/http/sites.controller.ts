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
import { SearchSitePlacesUseCase } from '../../application/use-cases/search-site-places.use-case';
import { CreateSiteDto } from './dto/create-site.dto';
import { ListSitesQueryDto } from './dto/list-sites.query.dto';
import { SearchSitePlacesQueryDto } from './dto/search-site-places.query.dto';
import { PlaceCandidateResponseDto } from './dto/place-candidate.response.dto';
import { SiteResponseDto } from './dto/site.response.dto';

@ApiTags('andanzas/sites')
@Controller('andanzas/sites')
@Auth()
export class SitesController {
  constructor(
    private readonly createSite: CreateSiteUseCase,
    private readonly getSite: GetSiteUseCase,
    private readonly listSites: ListSitesUseCase,
    private readonly searchSitePlaces: SearchSitePlacesUseCase,
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

  @Get('search')
  @ApiOperation({
    summary:
      'Buscar sitios en el proveedor externo (TASK-165) para crear uno a partir del resultado. Declarada antes de :id para que "search" no se confunda con un id.',
  })
  @ApiOkResponse({ type: PlaceCandidateResponseDto, isArray: true })
  async searchPlaces(
    @Query() query: SearchSitePlacesQueryDto,
  ): Promise<PlaceCandidateResponseDto[]> {
    const candidates = await this.searchSitePlaces.execute(query.q);
    return candidates.map((c) => PlaceCandidateResponseDto.fromCandidate(c));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver el detalle de un sitio.' })
  @ApiOkResponse({ type: SiteResponseDto })
  async get(@Param('id') id: string): Promise<SiteResponseDto> {
    const site = await this.getSite.execute(id);
    return SiteResponseDto.fromSite(site);
  }
}
