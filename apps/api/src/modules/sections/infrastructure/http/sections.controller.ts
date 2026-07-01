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
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../../../../shared/http/decorators/api-paginated-response.decorator';
import { PaginatedResponseDto } from '../../../../shared/http/dto/paginated-response.dto';
import type { AccessTokenPayload } from '../../../iam/application/ports/token-issuer.port';
import { CurrentUser } from '../../../iam/infrastructure/http/decorators/current-user.decorator';
import { RequiresPermission } from '../../../iam/infrastructure/http/decorators/requires-permission.decorator';
import { CreateSectionUseCase } from '../../application/use-cases/create-section.use-case';
import { DeleteSectionUseCase } from '../../application/use-cases/delete-section.use-case';
import { GetSectionTreeUseCase } from '../../application/use-cases/get-section-tree.use-case';
import { GetSectionUseCase } from '../../application/use-cases/get-section.use-case';
import { ListSectionsUseCase } from '../../application/use-cases/list-sections.use-case';
import { UpdateSectionUseCase } from '../../application/use-cases/update-section.use-case';
import { CreateSectionDto } from './dto/create-section.dto';
import { ListSectionsQueryDto } from './dto/list-sections-query.dto';
import { SectionResponseDto } from './dto/section-response.dto';
import { SectionTreeNodeDto } from './dto/section-tree-node.dto';
import { TreeQueryDto } from './dto/tree-query.dto';
import { UpdateSectionDto } from './dto/update-section.dto';

@ApiTags('sections')
@Controller('sections')
export class SectionsController {
  constructor(
    private readonly getSectionTree: GetSectionTreeUseCase,
    private readonly listSections: ListSectionsUseCase,
    private readonly getSection: GetSectionUseCase,
    private readonly createSection: CreateSectionUseCase,
    private readonly updateSection: UpdateSectionUseCase,
    private readonly deleteSection: DeleteSectionUseCase,
  ) {}

  @Get('tree')
  @ApiOperation({
    summary: 'Devuelve el árbol de secciones visibles para el usuario, filtrado por permisos.',
  })
  @ApiOkResponse({ type: [SectionTreeNodeDto] })
  async tree(
    @Query() query: TreeQueryDto,
    @CurrentUser() user?: AccessTokenPayload,
  ): Promise<SectionTreeNodeDto[]> {
    if (!user) throw new UnauthorizedException();
    const nodes = await this.getSectionTree.execute({
      scope: query.scope ?? 'BACKOFFICE',
      userId: user.sub,
    });
    return nodes.map((n) => SectionTreeNodeDto.fromDomain(n));
  }

  @Get()
  @RequiresPermission('iam.sections', 'READ')
  @ApiOperation({ summary: 'Listar secciones (paginado, sin filtro de permisos).' })
  @ApiPaginatedResponse(SectionResponseDto)
  async list(
    @Query() query: ListSectionsQueryDto,
  ): Promise<PaginatedResponseDto<SectionResponseDto>> {
    const { items, total } = await this.listSections.execute({
      page: query.page,
      limit: query.limit,
      sort: query.sort,
      order: query.order,
      scope: query.scope,
      isActive: query.isActive,
      codeContains: query.codeContains,
      nameContains: query.nameContains,
    });
    return PaginatedResponseDto.of(
      items.map(SectionResponseDto.fromDomain),
      total,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @RequiresPermission('iam.sections', 'READ')
  @ApiOperation({ summary: 'Obtener una sección por id.' })
  @ApiOkResponse({ type: SectionResponseDto })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<SectionResponseDto> {
    return SectionResponseDto.fromDomain(await this.getSection.execute(id));
  }

  @Post()
  @RequiresPermission('iam.sections', 'WRITE')
  @ApiOperation({ summary: 'Crear una sección.' })
  @ApiCreatedResponse({ type: SectionResponseDto })
  async create(@Body() dto: CreateSectionDto): Promise<SectionResponseDto> {
    return SectionResponseDto.fromDomain(
      await this.createSection.execute({
        code: dto.code,
        name: dto.name,
        icon: dto.icon ?? null,
        route: dto.route ?? null,
        parentId: dto.parentId ?? null,
        scope: dto.scope,
        order: dto.order,
        apiRequirements: dto.apiRequirements,
      }),
    );
  }

  @Patch(':id')
  @RequiresPermission('iam.sections', 'WRITE')
  @ApiOperation({ summary: 'Actualizar parcialmente una sección (incluye mover en el árbol).' })
  @ApiOkResponse({ type: SectionResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSectionDto,
  ): Promise<SectionResponseDto> {
    return SectionResponseDto.fromDomain(await this.updateSection.execute(id, dto));
  }

  @Delete(':id')
  @RequiresPermission('iam.sections', 'DELETE')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete de una sección (falla si tiene hijos activos).' })
  @ApiNoContentResponse()
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteSection.execute(id);
  }
}
